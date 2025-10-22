"""
Real-time Voice Agent with Live Supervisor Intervention
Handles actual phone calls with confidence-based escalation
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
from livekit.plugins import deepgram, google, silero

load_dotenv()

logger = logging.getLogger("salon-voice-agent")
logger.setLevel(logging.INFO)

# Salon business prompt
SYSTEM_PROMPT = """You are Bella, a professional AI receptionist for Luxe Beauty Salon.

## Your Role
You handle phone calls professionally, answer questions about services, and escalate to your supervisor when needed.

## Salon Information
**Hours:** Mon-Fri 9AM-7PM, Sat 10AM-6PM, Closed Sun
**Location:** 123 Main Street, Downtown | (555) 123-4567

**Services:**
- Haircuts: Women $65, Men $35, Kids $25
- Color: Full $120+, Highlights $140+, Balayage $180+
- Treatments: Conditioning $40, Keratin $250+
- Special Events: Wedding hair from $200

**Stylists:** Jawed (color specialist), Toni (master stylist), Alim (all-around), Ramesh Babu (colorist)

## Guidelines
1. Be warm, professional, and concise
2. Answer questions you're confident about
3. If uncertain or question is outside your knowledge, use escalate_to_supervisor
4. Keep responses brief (2-3 sentences max for phone calls)
5. After escalating, tell caller: "I'm checking with my supervisor. Please hold for just a moment."

## When to Escalate
- Questions about availability/appointments
- Pricing for custom services
- Specific stylist schedules
- Parking, payment methods, special requests
- ANY question you're not 100% confident about

Remember: Better to escalate than to guess!
"""


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

            while elapsed < max_wait:
                await asyncio.sleep(poll_interval)
                elapsed += poll_interval

                # Check if supervisor has responded
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{self.api_url}/api/help-requests/{request_id}"
                    ) as response:
                        result = await response.json()

                        if result.get("success"):
                            data = result["data"]
                            if data["status"] == "resolved":
                                logger.info(f"Supervisor responded: {data['supervisorResponse']}")
                                return {
                                    "answer": data["supervisorResponse"],
                                    "request_id": request_id
                                }

                logger.info(f"Waiting for supervisor... ({elapsed}s)")

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
        """
        logger.info("="*60)
        logger.info("LIVE ESCALATION DURING CALL")
        logger.info(f"Question: {question}")
        logger.info(f"Confidence: {confidence_level}")
        logger.info(f"Caller: {self.caller_name} ({self.caller_phone})")
        logger.info("="*60)

        # Ask supervisor (caller is on hold)
        result = await self.supervisor_chat.ask_supervisor(
            question=question,
            caller_name=self.caller_name,
            caller_phone=self.caller_phone,
            conversation_context=self.get_context_text(),
            session_id=self.session_id
        )

        if "answer" in result:
            # Got answer from supervisor!
            logger.info(f"Relaying supervisor answer to caller")
            return (
                f"My supervisor confirmed: {result['answer']}. "
                "Is there anything else I can help you with?"
            )
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
    """
    logger.info(f"Incoming call to room: {ctx.room.name}")

    # Initialize supervisor chat interface
    api_url = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
    supervisor_chat = SupervisorChat(api_url=api_url)

    # Initialize function context
    fnc_ctx = VoiceAgentFunctions(
        supervisor_chat=supervisor_chat,
        session_id=ctx.room.name
    )

    # Initialize voice pipeline with Gemini
    logger.info("Initializing voice pipeline...")

    # Create agent with instructions and tools
    agent = Agent(
        instructions=SYSTEM_PROMPT,
        tools=llm.find_function_tools(fnc_ctx),
    )

    # Create agent session with models
    session = AgentSession(
        stt=deepgram.STT(model="nova-2-phonecall", language="en-US"),
        llm=google.LLM(
            model="gemini-2.0-flash-exp",
            api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.7,
        ),
        tts=deepgram.TTS(model="aura-asteria-en"),
        vad=silero.VAD.load(),
    )

    # Track conversation events
    @session.on("user_input_transcribed")
    def on_user_speech(event):
        transcript = event.transcript if hasattr(event, 'transcript') else str(event)
        fnc_ctx.add_to_context("user", transcript)
        logger.info(f"Caller: {transcript}")

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
                instructions="Greet the caller warmly by saying: 'Hello! Thank you for calling Luxe Beauty Salon. I'm Bella, your AI receptionist. How may I help you today?'"
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
