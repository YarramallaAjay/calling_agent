"""
Knowledge Base Service with Pinecone Vector Search

Provides semantic search capabilities for the voice agent to query
the knowledge base before answering caller questions.
"""

import os
import logging
from typing import List, Dict, Optional, Tuple
from pinecone import Pinecone
import google.generativeai as genai

logger = logging.getLogger(__name__)

# Confidence thresholds
CONFIDENCE_HIGH = 0.85
CONFIDENCE_MEDIUM = 0.70


class KnowledgeBaseService:
    """Service for searching knowledge base using Pinecone vector search"""

    def __init__(self):
        """Initialize Pinecone and Google AI clients"""
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
            logger.info(f"✅ Connected to Pinecone index: {self.index_name}")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Pinecone index: {e}")
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
        logger.info("✅ Knowledge base service initialized")

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

            # Build filter
            filter_dict = {"isActive": True}
            if filter_tags:
                filter_dict["tags"] = {"$in": filter_tags}

            # Query Pinecone
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filter_dict
            )

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

            logger.info(f"🔍 Found {len(matches)} matches for query: {query[:50]}...")
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


# Global instance
_kb_service = None


def get_knowledge_base_service() -> KnowledgeBaseService:
    """Get or create the global KnowledgeBaseService instance"""
    global _kb_service
    if _kb_service is None:
        _kb_service = KnowledgeBaseService()
    return _kb_service
