# classifier.py — Keyword-based document department classifier
"""
POST /classify
  Input:  { "text": "document content" }
  Output: { "success": true, "department": "Finance", "confidenceScore": 90 }

Departments & their keywords:
  Finance    → budget, invoice, audit, payment, tax
  HR         → employee, recruitment, salary, leave, training
  Safety     → safety, accident, incident, risk
  Legal      → contract, agreement, compliance, legal
  Operations → maintenance, operations, schedule, track
  IT         → server, network, software, hardware, database, cybersecurity, it

Confidence score scales with the number of keyword hits (capped at 95).
If no keywords match, department defaults to "IT" with a score of 50
(IT is the canonical fallback for unclassifiable technical content).
"""

import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ---------------------------------------------------------------------------
# Keyword map — keys are department names, values are trigger words
# ---------------------------------------------------------------------------
DEPARTMENT_KEYWORDS: dict[str, list[str]] = {
    "Finance":    ["budget", "invoice", "audit", "payment", "tax", "financial", "revenue", "expenditure"],
    "HR":         ["employee", "recruitment", "salary", "leave", "training", "payroll", "hr", "human resources", "onboarding"],
    "Safety":     ["safety", "accident", "incident", "risk", "hazard", "emergency", "inspection", "evacuation"],
    "Legal":      ["contract", "agreement", "compliance", "legal", "legislation", "liability", "clause", "regulatory"],
    "Operations": ["maintenance", "operations", "schedule", "track", "procurement", "logistics", "workflow", "operational"],
    "IT":         ["server", "network", "software", "hardware", "database", "cybersecurity", "infrastructure", "system", "it", "technology", "backup", "firewall"],
}

# Confidence boundaries
_BASE_SCORE      = 60   # score for exactly 1 keyword hit
_SCORE_PER_HIT   = 10   # additional score per extra keyword hit
_MAX_SCORE       = 95   # ceiling so the model is never "100% certain"
_FALLBACK_DEPT   = "IT"   # canonical fallback — never 'General'
_FALLBACK_SCORE  = 50


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    success: bool
    department: str
    confidenceScore: int


# ---------------------------------------------------------------------------
# Core classification logic
# ---------------------------------------------------------------------------
def _tokenize(text: str) -> set[str]:
    """Lower-case and extract word tokens from raw text."""
    return set(re.findall(r"[a-zA-Z]+", text.lower()))


def classify_text(text: str) -> tuple[str, int]:
    """
    Classify *text* into a department using keyword matching.

    Returns
    -------
    (department, confidence_score)
    """
    tokens = _tokenize(text)

    scores: dict[str, int] = {}
    for dept, keywords in DEPARTMENT_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in tokens)
        if hits > 0:
            score = min(_BASE_SCORE + (hits - 1) * _SCORE_PER_HIT, _MAX_SCORE)
            scores[dept] = score

    if not scores:
        return _FALLBACK_DEPT, _FALLBACK_SCORE

    # Pick the department with the highest score; break ties alphabetically
    best_dept = max(scores, key=lambda d: (scores[d], d))
    return best_dept, scores[best_dept]


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
@router.post("/classify", response_model=ClassifyResponse)
def classify_document(body: ClassifyRequest):
    """
    Classify the supplied document text into a KMRL department.

    - **text**: Raw document content to classify.

    Returns the predicted **department** and a **confidenceScore** (0-100).
    """
    text = body.text

    if not text or not text.strip():
        raise HTTPException(
            status_code=400,
            detail="Field 'text' is required and cannot be empty."
        )

    try:
        department, confidence_score = classify_text(text.strip())
        return ClassifyResponse(
            success=True,
            department=department,
            confidenceScore=confidence_score,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Classification failed: {str(e)}"
        )
