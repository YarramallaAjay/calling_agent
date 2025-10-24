"""
Knowledge Base Service with Pinecone Vector Search

Provides semantic search capabilities for the voice agent to query
the knowledge base before answering caller questions.
"""

import os
import logging
from typing import List, Dict, Optional, Tuple
try:
    from pinecone import Pinecone
except ImportError:
    from pinecone.grpc import PineconeGRPC as Pinecone
import google.generativeai as genai

logger = logging.getLogger(__name__)

# Confidence thresholds
# Lowered from 0.85/0.70 to be more lenient with semantic matches
CONFIDENCE_HIGH = 0.75  # Very strong match
CONFIDENCE_MEDIUM = 0.55  # Good match, use with context


class KnowledgeBaseService:
    """
    Service for searching knowledge base with hierarchical strategy:
    1. Structured business context (direct lookup)
    2. Semantic vector search (Pinecone)
    3. Escalation (fallback)
    """

    def __init__(self):
        """Initialize Pinecone and Google AI clients"""
        self.master_business_context = None
        self.master_context_fetched = False

        # Initialize Pinecone
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        if not pinecone_api_key:
            logger.warning("PINECONE_API_KEY not set - knowledge base search disabled")
            self.enabled = False
            return

        self.pc = Pinecone(api_key=pinecone_api_key)
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "luxe-salon-knowledge")

        try:
            self.index = self.pc.Index(self.index_name)
            logger.info(f"[SUCCESS] Connected to Pinecone index: {self.index_name}")
        except Exception as e:
            logger.error(f"[ERROR] Failed to connect to Pinecone index: {e}")
            self.enabled = False
            return

        # Initialize Google Generative AI for embeddings
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not gemini_api_key:
            logger.warning("GEMINI_API_KEY not set - embedding generation disabled")
            self.enabled = False
            return

        genai.configure(api_key=gemini_api_key)
        self.enabled = True
        logger.info("[SUCCESS] Knowledge base service initialized with hierarchical search")

    def get_master_business_context(self) -> Optional[Dict]:
        """
        Fetch the master business context record from Pinecone.
        This contains all structured business information (working hours, pricing, etc.)
        Cached after first fetch for performance.

        Returns:
            Dictionary with business context or None if not found
        """
        if self.master_context_fetched:
            return self.master_business_context

        if not self.enabled:
            return None

        try:
            logger.info("[MASTER CONTEXT] Fetching master business context from Pinecone...")

            # Search for the master context record using metadata filter
            # We filter by type='business_context' and question='MASTER_BUSINESS_CONTEXT'
            results = self.index.query(
                vector=[0] * 768,  # Dummy vector, we only care about filter match
                top_k=1,
                filter={
                    "type": {"$eq": "business_context"},
                    "question": {"$eq": "MASTER_BUSINESS_CONTEXT"}
                },
                include_metadata=True
            )

            if results.matches and len(results.matches) > 0:
                match = results.matches[0]
                metadata = match.metadata

                # Parse the JSON answer field
                import json
                try:
                    business_data = json.loads(metadata.get('answer', '{}'))
                    self.master_business_context = business_data
                    self.master_context_fetched = True
                    logger.info("[SUCCESS] Master business context loaded and cached")
                    return business_data
                except json.JSONDecodeError as e:
                    logger.error(f"[ERROR] Failed to parse master context JSON: {e}")
                    return None
            else:
                logger.warning("[WARNING] Master business context not found in Pinecone")
                logger.warning("[WARNING] Please run: node scripts/add_business_context.js")
                self.master_context_fetched = True
                return None

        except Exception as e:
            logger.error(f"[ERROR] Failed to fetch master business context: {e}")
            return None

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for text using Google's text-embedding-004 model

        Args:
            text: Input text to embed

        Returns:
            List of floats representing the embedding (768 dimensions)
        """
        try:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise

    def search(
        self,
        query: str,
        top_k: int = 3,
        filter_tags: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Search knowledge base for similar questions

        Args:
            query: The caller's question
            top_k: Number of results to return
            filter_tags: Optional list of tags to filter by

        Returns:
            List of matches with question, answer, score, and confidence level
        """
        if not self.enabled:
            logger.warning("Knowledge base search is disabled")
            return []

        try:
            # Generate embedding for query
            query_embedding = self.generate_embedding(query)

            # Build filter - only filter by tags if specified
            filter_dict = None
            if filter_tags:
                filter_dict = {"tags": {"$in": filter_tags}}

            # Query Pinecone
            query_params = {
                "vector": query_embedding,
                "top_k": top_k,
                "include_metadata": True
            }

            # Only add filter if it exists
            if filter_dict:
                query_params["filter"] = filter_dict

            results = self.index.query(**query_params)

            # Parse results
            matches = []
            for match in results.matches:
                score = match.score
                metadata = match.metadata

                # Determine confidence level
                if score >= CONFIDENCE_HIGH:
                    confidence = "high"
                elif score >= CONFIDENCE_MEDIUM:
                    confidence = "medium"
                else:
                    confidence = "low"

                matches.append({
                    "id": match.id,
                    "question": metadata.get("question", ""),
                    "answer": metadata.get("answer", ""),
                    "type": metadata.get("type", ""),
                    "tags": metadata.get("tags", "").split(",") if metadata.get("tags") else [],
                    "score": score,
                    "confidence": confidence
                })

            logger.info(f"[SEARCH] Found {len(matches)} matches for query: {query[:50]}...")
            if matches:
                logger.info(f"   Top match: {matches[0]['question'][:50]}... (score: {matches[0]['score']:.3f}, confidence: {matches[0]['confidence']})")

            return matches

        except Exception as e:
            logger.error(f"Error searching knowledge base: {e}")
            return []

    def get_best_match(self, query: str) -> Optional[Tuple[Dict, str]]:
        """
        Get the best matching answer for a query

        Args:
            query: The caller's question

        Returns:
            Tuple of (match_dict, decision) where decision is:
            - "answer": High confidence, use answer directly
            - "context": Medium confidence, use as context for LLM
            - "escalate": Low confidence, escalate to supervisor
            Or None if no results
        """
        matches = self.search(query, top_k=1)

        if not matches:
            return None

        best_match = matches[0]
        confidence = best_match["confidence"]

        if confidence == "high":
            return (best_match, "answer")
        elif confidence == "medium":
            return (best_match, "context")
        else:
            return (best_match, "escalate")

    def format_context_for_prompt(self, matches: List[Dict]) -> str:
        """
        Format knowledge base matches as context for the LLM prompt

        Args:
            matches: List of match dictionaries

        Returns:
            Formatted string to include in system prompt
        """
        if not matches:
            return ""

        context_lines = ["Here is relevant information from the knowledge base:"]

        for i, match in enumerate(matches, 1):
            context_lines.append(f"\n{i}. Q: {match['question']}")
            context_lines.append(f"   A: {match['answer']}")
            context_lines.append(f"   (Relevance: {match['score']:.2f})")

        context_lines.append("\nUse this information to inform your response.")

        return "\n".join(context_lines)

    def extract_context_from_history(
        self,
        query: str,
        conversation_history: List[Dict[str, str]]
    ) -> str:
        """
        Extract relevant context from conversation history to enrich the query.

        Args:
            query: Current user query
            conversation_history: List of {role, content} messages

        Returns:
            Enriched query with conversation context
        """
        if not conversation_history:
            return query

        # Get last 5 messages for context
        recent_messages = conversation_history[-5:]

        # Extract user questions for context
        user_questions = [
            msg['content'] for msg in recent_messages
            if msg['role'] == 'user' and len(msg['content']) > 3
        ]

        # Check for contextual references in current query
        query_lower = query.lower()
        contextual_words = ['that', 'this', 'it', 'there', 'same', 'also', 'too']
        has_context_reference = any(word in query_lower for word in contextual_words)

        # If query has contextual references or is short, add previous context
        if has_context_reference or len(query.split()) < 4:
            if user_questions:
                # Combine previous question with current for better context
                context_query = f"{user_questions[-1]} {query}"
                logger.info(f"[CONTEXT] Enriched query: {context_query[:80]}...")
                return context_query

        return query

    def expand_query_to_sub_queries(self, query: str) -> List[str]:
        """
        Expand a query into multiple sub-queries for comprehensive search.

        Args:
            query: User's question

        Returns:
            List of sub-queries including the original
        """
        queries = [query]  # Always include original

        query_lower = query.lower()

        # Handle time-based queries
        day_keywords = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        has_day = any(day in query_lower for day in day_keywords)

        if has_day:
            # If asking about a specific day, also search for general hours/schedule
            if 'appointment' in query_lower or 'book' in query_lower or 'schedule' in query_lower:
                queries.append("working hours schedule")
                queries.append("appointment booking")
            elif 'hours' not in query_lower and 'open' not in query_lower:
                queries.append("what are the working hours")

        # Handle appointment queries
        if 'appointment' in query_lower or 'book' in query_lower:
            if 'cancel' in query_lower or 'reschedule' in query_lower:
                queries.append("cancellation policy")
            else:
                queries.append("how to book appointment")
                if has_day:
                    queries.append("working days schedule")

        # Handle facility queries
        if 'parking' in query_lower:
            if 'hours' in query_lower or 'time' in query_lower:
                queries.append("parking availability")
                queries.append("facility hours")
            else:
                queries.append("parking facilities")

        # Handle price/cost queries
        if any(word in query_lower for word in ['price', 'cost', 'charge', 'fee', 'how much']):
            # Extract service name if present
            services = ['haircut', 'color', 'facial', 'manicure', 'pedicure', 'bridal', 'makeup']
            for service in services:
                if service in query_lower:
                    queries.append(f"{service} pricing")

        logger.info(f"[MULTI-QUERY] Expanded to {len(queries)} queries: {queries}")
        return queries

    def search_with_context(
        self,
        query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        top_k: int = 5
    ) -> Tuple[Optional[Dict], List[Dict]]:
        """
        Improved search strategy with master business context:

        STEP 1: Fetch master business context (structured business data)
        STEP 2: Perform semantic vector search
        STEP 3: Return both to LLM for intelligent decision

        The LLM will:
        - Extract relevant info from master business context
        - Consider semantic search results
        - Decide confidence level and whether to escalate

        Args:
            query: The caller's question
            conversation_history: Previous conversation messages
            top_k: Number of results per query

        Returns:
            Tuple of (master_business_context, semantic_search_results)
        """
        if not self.enabled:
            logger.warning("Knowledge base search is disabled")
            return (None, [])

        try:
            logger.info(f"[SEARCH] Starting search for: '{query[:60]}...'")

            # STEP 1: Fetch master business context
            master_context = self.get_master_business_context()
            if master_context:
                logger.info("[MASTER CONTEXT] ✓ Business context available")
            else:
                logger.warning("[MASTER CONTEXT] ✗ Business context not available")

            # STEP 2: Semantic vector search
            logger.info("[SEMANTIC SEARCH] Performing vector search...")

            # Enrich query with conversation context
            enriched_query = self.extract_context_from_history(
                query,
                conversation_history or []
            )

            # Expand query into sub-queries
            queries = self.expand_query_to_sub_queries(enriched_query)

            # Search with each query
            all_matches = {}  # Use dict to deduplicate by ID

            for q in queries:
                results = self.search(q, top_k=top_k)
                for result in results:
                    result_id = result['id']
                    # Keep highest scoring match for each ID
                    if result_id not in all_matches or result['score'] > all_matches[result_id]['score']:
                        all_matches[result_id] = result

            # Sort by score and filter out the master context record itself
            sorted_matches = sorted(
                [m for m in all_matches.values() if m.get('question') != 'MASTER_BUSINESS_CONTEXT'],
                key=lambda x: x['score'],
                reverse=True
            )[:top_k]

            logger.info(f"[SEARCH] ✓ Complete - Master context: {bool(master_context)}, Semantic matches: {len(sorted_matches)}")
            if sorted_matches:
                top = sorted_matches[0]
                logger.info(f"[SEARCH] Top semantic match: {top['question'][:50]}... (score: {top['score']:.3f}, confidence: {top['confidence']})")

            return (master_context, sorted_matches)

        except Exception as e:
            logger.error(f"[ERROR] Search failed: {e}")
            # Fallback to basic search
            return (None, self.search(query, top_k=top_k))


# Global instance
_kb_service = None


def get_knowledge_base_service() -> KnowledgeBaseService:
    """Get or create the global KnowledgeBaseService instance"""
    global _kb_service
    if _kb_service is None:
        _kb_service = KnowledgeBaseService()
    return _kb_service
