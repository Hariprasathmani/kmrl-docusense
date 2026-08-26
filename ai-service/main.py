from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from extractor import router as extractor_router
from summarizer import router as summarizer_router
from classifier import router as classifier_router
from rag import router as rag_router

app = FastAPI(title="KMRL DocuSense AI Service")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(extractor_router)
app.include_router(summarizer_router)
app.include_router(classifier_router)
app.include_router(rag_router)

@app.get("/health")
def health_check():
    return {
        "success": True,
        "message": "AI Service Running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
