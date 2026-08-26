# KMRL DocuSense 📄

> Intelligent Document Automation System for Kochi Metro Rail Limited

## Overview

KMRL DocuSense is an AI-powered document management and automation platform that enables intelligent document processing, classification, summarization, and retrieval for KMRL's operational workflows.

## Architecture

```
kmrl-document-automation-system/
├── client/          # React 18 frontend
├── server/          # Node.js + Express REST API
├── ai-service/      # Python FastAPI AI microservice
└── docker-compose.yml
```

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, Axios               |
| Backend    | Node.js, Express, Mongoose          |
| Database   | MongoDB                             |
| AI Service | Python 3.11, FastAPI, LangChain     |
| Auth       | JWT                                 |

## Getting Started

### Prerequisites

- Node.js >= 18
- Python >= 3.11
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install

# Install AI service dependencies
cd ../ai-service && pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy and fill environment files
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
cp ai-service/.env.example ai-service/.env
```

### 3. Run Services

```bash
# Start backend (from server/)
npm run dev

# Start frontend (from client/)
npm run dev

# Start AI service (from ai-service/)
uvicorn main:app --reload --port 8000
```

## Environment Variables

See `.env.example` files in each directory for required configuration.

## License

Proprietary — Kochi Metro Rail Limited
