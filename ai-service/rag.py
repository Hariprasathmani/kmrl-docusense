# rag.py — Retrieval-Augmented Generation (RAG) Q&A module
"""
POST /rag
  Input:  { "question": "...", "context": "..." }
  Output: { "answer": "..." }

Currently implements a simple keyword-matching answer over the supplied context.
LangChain/ChromaDB integration to be added in the next phase.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import re

router = APIRouter()


class RagRequest(BaseModel):
    question: str
    context: Optional[str] = ""


class RagResponse(BaseModel):
    answer: str


def _simple_answer(question: str, context: str) -> str:
    """
    Lightweight keyword-search answer:
    - Splits context into sentences.
    - Returns up to 3 sentences that contain keywords from the question.
    - Falls back to the first 3 sentences of context if no match.
    """
    if not context or not context.strip():
        return "No document context was provided to answer your question."

    # Tokenise the question into keywords (words >= 4 chars)
    keywords = set(re.findall(r"[a-zA-Z]{4,}", question.lower()))

    # Split context into sentences
    sentence_pattern = re.compile(r'(?<=[.!?])\s+')
    sentences = [s.strip() for s in sentence_pattern.split(context) if s.strip()]

    if keywords:
        matched = [
            s for s in sentences
            if any(kw in s.lower() for kw in keywords)
        ]
        if matched:
            return ' '.join(matched[:3])

    # Fallback: first 3 sentences of context
    fallback = ' '.join(sentences[:3])
    return fallback or context[:500]


@router.post("/rag", response_model=RagResponse)
async def rag_query(body: RagRequest):
    """
    Answer a natural-language question using the supplied document context.

    - **question**: The user's question.
    - **context**: Pre-built context string from authorised documents.
    """
    if not body.question or not body.question.strip():
        raise HTTPException(status_code=400, detail="'question' is required.")

    answer = _simple_answer(body.question.strip(), body.context or "")
    return RagResponse(answer=answer)
