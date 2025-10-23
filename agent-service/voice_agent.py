"""
Real-time Voice Agent with Live Supervisor Intervention
Handles actual phone calls with confidence-based escalation
Integrated with Pinecone knowledge base for semantic search
"""

import asyncio
import logging
import os
from dotenv import load_dotenv
import aiohttp

from livekit.agents import (
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import deepgram, google

from knowledge_base import get_knowledge_base_service

load_dotenv()

logger = logging.getLogger("salon-voice-agent")
logger.setLevel(logging.INFO)

# Base system prompt (will be augmented with KB results dynamically)
BASE_SYSTEM_PROMPT = """You are Pari, a professional receptionist for Luxe Beauty Salon in Bandra, Mumbai.

## Your Role
You handle phone calls professionally and answer questions about our salon. You have access to a knowledge base that contains all business information, policies, and learned answers from previous interactions.

## Guidelines
1. Be warm, professional, and concise
2. Use the knowledge base context provided to answer questions accurately
3. If knowledge base provides high-confidence answer, use it directly
4. If knowledge base provides medium-confidence answer, use it as guidance but verify
5. If no relevant knowledge or low confidence, escalate to supervisor
6. Keep responses brief (2-3 sentences max for phone calls)

## CRITICAL: Escalation Protocol
When you need to escalate to supervisor, you MUST follow this exact flow:
1. FIRST: Speak to the caller: "Let me check with my supervisor on that for you. Please hold for just a moment."
2. THEN: Call the escalate_to_supervisor function
3. The function will wait for the supervisor's response (caller is on hold)
4. When function returns, speak the supervisor's answer politely

## When to Escalate
- No relevant knowledge base results found
- Knowledge base confidence is low (<70%)
- Real-time information needed (today's availability, current appointments)
- Specific booking/scheduling requests
- Questions that remain unclear after asking for clarification

Remember: The knowledge base is your primary source of information. Trust high-confidence results!
"""


def build_system_prompt_with_kb(kb_results=None):
    """Build dynamic system prompt with knowledge base context"""
    prompt = BASE_SYSTEM_PROMPT

    if kb_results and len(kb_results) > 0:
        top_result = kb_results[0]
        confidence = top_result['confidence']

        # Add KB context based on confidence
        if confidence == 'high':
            prompt += f"\n\n## HIGH CONFIDENCE - Use This Answer:\n"
            prompt += f"Q: {top_result['question']}\n"
            prompt += f"A: {top_result['answer']}\n"
            prompt += f"(Match score: {top_result['score']:.2f})\n"
            prompt += "\nThis is a highly relevant match. Use this answer to respond to the caller."

        elif confidence == 'medium':
            prompt += f"\n\n## MEDIUM CONFIDENCE - Consider This Context:\n"
            prompt += f"Q: {top_result['question']}\n"
            prompt += f"A: {top_result['answer']}\n"
            prompt += f"(Match score: {top_result['score']:.2f})\n"
            prompt += "\nThis may be relevant. Use as guidance, but consider escalating if you're unsure."

        # Show additional results if available
        if len(kb_results) > 1:
            prompt += f"\n\n## Additional Related Information:\n"
            for i, result in enumerate(kb_results[1:3], 2):
                prompt += f"{i}. {result['question']}: {result['answer'][:100]}...\n"

    return prompt


class SupervisorChat:
    """Manages real-time chat with supervisor during calls"""

    def __init__(self, api_url: str):
        self.api_url = api_url
        self.pending_questions = {}  # {request_id: question_data}

    async def ask_supervisor(
        self,
        question: str,
        caller_name: str,
        caller_phone: str,
        conversation_context: str,
        session_id: str
    ) -> dict:
        """
        Ask supervisor for help and wait for response.
        This creates a help request and polls for supervisor answer.
        """
        logger.info(f"Asking supervisor: {question}")

        try:
            # Create help request
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_url}/api/help-requests",
                    json={
                        "question": question,
                        "callerPhone": caller_phone,
                        "callerName": caller_name,
                        "context": conversation_context,
                        "sessionId": session_id,
                    },
                ) as response:
                    result = await response.json()

                    if not result.get("success"):
                        return {"error": "Failed to create help request"}

                    request_id = result["data"]["id"]
                    logger.info(f"Created help request: {request_id}")

            # Poll for supervisor response (real-time intervention)
            # In production, use WebSocket for instant updates
            max_wait = 300  # 5 minutes max
            poll_interval = 2  # Check every 2 seconds
            elapsed = 0

            logger.info(f"Starting to poll for request {request_id}")

            while elapsed < max_wait:
                await asyncio.sleep(poll_interval)
                elapsed += poll_interval

                # Check if supervisor has responded
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{self.api_url}/api/help-requests/{request_id}",
                        headers={
                            "Cache-Control": "no-cache",
                            "Pragma": "no-cache"
                        }
                    ) as response:
                        result = await response.json()

                        logger.info(f"Poll {elapsed}s - Response: {result.get('success')}, Status: {result.get('data', {}).get('status') if result.get('success') else 'N/A'}")

                        if result.get("success"):
                            data = result["data"]
                            logger.info(f"Request status: {data.get('status')}, has response: {bool(data.get('supervisorResponse'))}")

                            if data["status"] == "resolved":
                                logger.info(f"Supervisor responded: {data['supervisorResponse']}")
                                return {
                                    "answer": data["supervisorResponse"],
                                    "request_id": request_id
                                }
                        else:
                            logger.warning(f"API error: {result.get('error')}")

                logger.info(f"Waiting for supervisor... ({elapsed}s/{max_wait}s)")

            # Timeout
            logger.warning("Supervisor response timeout")
            return {"error": "Supervisor did not respond in time"}

        except Exception as e:
            logger.error(f"Error asking supervisor: {e}")
            return {"error": str(e)}


class VoiceAgentFunctions:
    """Functions available to the voice agent during calls"""

    def __init__(self, supervisor_chat: SupervisorChat, session_id: str):
        self.supervisor_chat = supervisor_chat
        self.session_id = session_id
        self.conversation_context = []
        self.caller_name = "Unknown"
        self.caller_phone = "Unknown"

    def add_to_context(self, role: str, content: str):
        """Track conversation for context"""
        self.conversation_context.append({"role": role, "content": content})

    def get_context_text(self) -> str:
        """Get conversation context as text"""
        return "\n".join([
            f"{'Caller' if msg['role'] == 'user' else 'Agent'}: {msg['content']}"
            for msg in self.conversation_context[-10:]  # Last 10 messages
        ])

    @llm.function_tool(
        description=(
            "Escalate to supervisor when you're not confident about an answer. "
            "IMPORTANT: Pass the EXACT question the caller asked, not your interpretation. "
            "Use this for: appointment availability, specific pricing, stylist schedules, "
            "parking, payment methods, or ANY question you're uncertain about. "
            "The caller will be placed on hold while you get the answer."
        )
    )
    async def escalate_to_supervisor(
        self,
        question: str,
        confidence_level: str = "low",
    ) -> str:
        """
        Escalate to supervisor during the live call.
        Caller stays on hold while supervisor responds.

        Args:
            question: The EXACT question the caller asked (not your interpretation)
            confidence_level: How confident you are (low, medium, high)
        """
        logger.info("="*60)
        logger.info("LIVE ESCALATION DURING CALL")
        logger.info(f"Question: {question}")
        logger.info(f"Confidence: {confidence_level}")
        logger.info(f"Caller: {self.caller_name} ({self.caller_phone})")
        logger.info("="*60)

        # Get the last few user messages for better context
        recent_user_messages = [
            msg['content'] for msg in self.conversation_context[-5:]
            if msg['role'] == 'user'
        ]

        # If question seems unclear, include recent context
        if len(question.split()) < 3 or any(word in question.lower() for word in ['unclear', 'understand', 'hear']):
            full_context = f"Recent caller messages: {' | '.join(recent_user_messages)}\n\nCurrent question: {question}"
        else:
            full_context = self.get_context_text()

        # Ask supervisor (caller is on hold)
        result = await self.supervisor_chat.ask_supervisor(
            question=question,
            caller_name=self.caller_name,
            caller_phone=self.caller_phone,
            conversation_context=full_context,
            session_id=self.session_id
        )

        if "answer" in result:
            # Got answer from supervisor!
            logger.info(f"Relaying supervisor answer to caller")
            return result['answer']
        else:
            # Supervisor didn't respond in time
            logger.warning("Supervisor timeout, offering callback")
            return (
                "I apologize, my supervisor is assisting another client right now. "
                f"I've noted your question and we'll call you back at {self.caller_phone} "
                "within the hour. Is there anything else I can help you with today?"
            )




async def entrypoint(ctx: JobContext):
    """
    Main entry point for voice agent.
    Handles incoming phone calls with real-time supervisor intervention.
    Integrated with Pinecone knowledge base for semantic search.
    """
    logger.info(f"Incoming call to room: {ctx.room.name}")

    # Initialize supervisor chat interface
    api_url = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
    logger.info(f"Using API URL: {api_url}")

    # Initialize knowledge base service
    kb_service = get_knowledge_base_service()
    if kb_service.enabled:
        logger.info("✅ Knowledge base enabled")
    else:
        logger.warning("⚠️ Knowledge base disabled - will rely on basic prompt only")

    # Verify API is reachable
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{api_url}/api/help-requests/pending", timeout=aiohttp.ClientTimeout(total=5)) as response:
                if response.status == 200:
                    logger.info("API connection verified")
                else:
                    logger.warning(f"API returned status {response.status}")
    except Exception as e:
        logger.error(f"Cannot reach API at {api_url}: {e}")
        logger.error("Escalations may not work properly!")

    supervisor_chat = SupervisorChat(api_url=api_url)

    # Initialize function context
    fnc_ctx = VoiceAgentFunctions(
        supervisor_chat=supervisor_chat,
        session_id=ctx.room.name
    )

    # Initialize voice pipeline with Gemini
    logger.info("Initializing voice pipeline...")

    # Create agent with base instructions and tools
    # Instructions will be dynamically updated based on KB search results
    agent = Agent(
        instructions=BASE_SYSTEM_PROMPT,
        tools=llm.find_function_tools(fnc_ctx),
    )

    # Create agent session with models
    # Note: VAD removed to reduce memory usage (Silero VAD uses ~300MB)
    # LiveKit will use server-side voice detection instead
    session = AgentSession(
        stt=deepgram.STT(model="nova-2-phonecall", language="en-US"),
        llm=google.LLM(
            model="gemini-2.0-flash-exp",
            api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.7,
        ),
        tts=deepgram.TTS(model="aura-asteria-en"),
    )

    # Track conversation events with KB search integration
    @session.on("user_input_transcribed")
    def on_user_speech(event):
        transcript = event.transcript if hasattr(event, 'transcript') else str(event)

        # Get confidence score if available
        confidence = getattr(event, 'confidence', None)
        if confidence is not None:
            logger.info(f"Caller: {transcript} (confidence: {confidence:.2f})")
        else:
            logger.info(f"Caller: {transcript}")

        # Log low-confidence transcriptions
        if confidence and confidence < 0.7:
            logger.warning(f"Low confidence transcription: '{transcript}' ({confidence:.2f})")

        fnc_ctx.add_to_context("user", transcript)

        # Extract caller name from first message
        if fnc_ctx.caller_name == "Unknown":
            content_lower = transcript.lower()
            if "my name is" in content_lower or "i'm" in content_lower or "i am" in content_lower:
                words = transcript.split()
                for i, word in enumerate(words):
                    if word.lower() in ["is", "i'm", "am"] and i + 1 < len(words):
                        potential_name = words[i + 1].strip(".,!?")
                        if potential_name and potential_name[0].isupper():
                            fnc_ctx.caller_name = potential_name
                            logger.info(f"Caller name: {potential_name}")
                            break

        # Search knowledge base for relevant information
        if kb_service.enabled and len(transcript.split()) > 2:  # Only search substantial queries
            try:
                logger.info(f"🔍 Searching knowledge base for: {transcript}")
                kb_results = kb_service.search(transcript, top_k=3)

                if kb_results:
                    # Update agent instructions with KB context
                    dynamic_prompt = build_system_prompt_with_kb(kb_results)
                    agent.instructions = dynamic_prompt

                    top_match = kb_results[0]
                    logger.info(f"✅ KB Match: {top_match['question'][:50]}... (confidence: {top_match['confidence']}, score: {top_match['score']:.3f})")
                else:
                    # Reset to base prompt if no results
                    agent.instructions = BASE_SYSTEM_PROMPT
                    logger.info("⚠️ No KB matches found")

            except Exception as e:
                logger.error(f"Error searching KB: {e}")
                agent.instructions = BASE_SYSTEM_PROMPT

    @session.on("speech_created")
    def on_agent_speech(speech):
        if hasattr(speech, 'text') and speech.text:
            fnc_ctx.add_to_context("assistant", speech.text)
            logger.info(f"Agent: {speech.text}")

    @session.on("function_tools_executed")
    def on_function_executed(event):
        logger.info("Function tool executed")

    # Greet user when they connect
    greeted = False

    @ctx.room.on("participant_connected")
    def on_participant_connected(participant):
        nonlocal greeted
        # Only greet human participants (not the agent itself)
        if not greeted and participant.kind == "standard":
            greeted = True
            logger.info(f"Participant connected: {participant.identity}, sending greeting")
            # Schedule greeting to run asynchronously
            asyncio.create_task(session.generate_reply(
                instructions="Greet the caller warmly by saying: 'Hello! Thank you for calling Luxe Beauty Salon. I'm Bella. How may I help you today?'"
            ))

    # Start the agent session
    logger.info("Starting voice agent session")
    logger.info("Monitoring for escalations")

    # Start session (this blocks until session ends)
    await session.start(agent=agent, room=ctx.room)

    logger.info("Voice agent session ended")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
