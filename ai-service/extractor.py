# extractor.py — Multi-format document text extractor
"""
POST /extract
  Input:  { "filePath": "path/to/file" }
  Output: { "success": true, "text": "extracted content" }

Supported formats:
  .txt  → built-in file reader (UTF-8)
  .pdf  → pdfplumber  (all pages concatenated)
  .docx → python-docx (all paragraphs joined)

Errors raised:
  404 — file not found
  400 — unsupported file extension
  500 — extraction failure
"""

import os
from pathlib import Path

import pdfplumber
from docx import Document as DocxDocument
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ---------------------------------------------------------------------------
# Supported extensions
# ---------------------------------------------------------------------------
SUPPORTED_EXTENSIONS = {'.txt', '.pdf', '.docx'}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class ExtractRequest(BaseModel):
    filePath: str


class ExtractResponse(BaseModel):
    success: bool
    text: str


# ---------------------------------------------------------------------------
# Per-format extraction helpers
# ---------------------------------------------------------------------------
def _extract_txt(file_path: str) -> str:
    """Read a plain-text file as UTF-8, falling back to latin-1 on decode errors."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        with open(file_path, 'r', encoding='latin-1') as f:
            return f.read()


def _extract_pdf(file_path: str) -> str:
    """Extract text from every page of a PDF using pdfplumber."""
    pages_text = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                pages_text.append(page_text)
    return '\n'.join(pages_text)


def _extract_docx(file_path: str) -> str:
    """Extract text from all paragraphs of a DOCX file using python-docx."""
    doc = DocxDocument(file_path)
    paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
    return '\n'.join(paragraphs)


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
@router.post("/extract", response_model=ExtractResponse)
def extract_text(request: ExtractRequest):
    """
    Extract plain text from a TXT, PDF, or DOCX file.

    - **filePath**: Absolute or relative path to the document on the server.
    """
    file_path = request.filePath

    # Guard: file must exist
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    # Detect extension
    ext = Path(file_path).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{ext}'. "
                f"Supported types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            ),
        )

    # Dispatch to the appropriate extractor
    try:
        if ext == '.txt':
            text = _extract_txt(file_path)
        elif ext == '.pdf':
            text = _extract_pdf(file_path)
        elif ext == '.docx':
            text = _extract_docx(file_path)

        if not text or not text.strip():
            # File parsed successfully but yielded no content
            text = ''

        return ExtractResponse(success=True, text=text)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed for '{ext}' file: {str(e)}"
        )
