# summarizer.py — Lightweight prototype document summarizer
"""
POST /summarize
  Input:  { "text": "long text..." }
  Output: { "success": true, "summary": "..." }

Logic:
  - Text < 300 chars  → return as-is
  - Text >= 300 chars → return first 3 sentences
  
No external ML libraries required. Hugging Face to be integrated later.
"""

import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class SummarizeRequest(BaseModel):
    text: str


class SummarizeResponse(BaseModel):
    success: bool
    summary: str


def extract_first_n_sentences(text: str, n: int = 3) -> str:
    """
    Split text into sentences and return the first `n`.
    Uses a regex that handles common sentence-ending punctuation
    (., !, ?) while avoiding false splits on abbreviations like Mr. or e.g.
    """
    # Split on sentence-ending punctuation followed by whitespace or end-of-string
    sentence_endings = re.compile(r'(?<=[.!?])\s+')
    sentences = sentence_endings.split(text.strip())

    # Filter out empty strings that may result from splitting
    sentences = [s.strip() for s in sentences if s.strip()]

    first_n = sentences[:n]
    return ' '.join(first_n)


@router.post("/summarize", response_model=SummarizeResponse)
def summarize_text(body: SummarizeRequest):
    """
    Summarizes the provided text.
    - If text is shorter than 300 characters, returns it as-is.
    - If text is 300+ characters, returns the first 3 sentences.
    """
    text = body.text

    # Validate: text must be present and non-empty
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Field 'text' is required and cannot be empty.")

    try:
        if len(text) < 300:
            # Short text — return as-is
            summary = text.strip()
        else:
            # Long text — extract first 3 sentences
            summary = extract_first_n_sentences(text, n=3)

            # Fallback: if sentence splitting produced nothing, return a character slice
            if not summary:
                summary = text.strip()[:300]

        return SummarizeResponse(success=True, summary=summary)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")
