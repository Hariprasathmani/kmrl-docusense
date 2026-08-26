# KMRL DocuSense 📄

> Intelligent Document Automation System for Kochi Metro Rail Limited

An AI-powered platform for automating document workflows, ticket management, employee leave requests, and cross-department routing with real-time updates and intelligent document processing.

---

## 📋 Features

- **Smart Document Processing**: Upload, classify, summarize, and extract information from documents using AI
- **Ticket Management System**: Create, track, and resolve support tickets with departmental routing
- **Leave Request Workflow**: Employees can submit leave requests with automated approval routing
- **Real-Time Updates**: 5-second auto-refresh polling for ticket status and request tracking
- **Role-Based Access Control (RBAC)**: Admin, Officer, and Viewer roles with specific permissions
- **Gmail Integration**: Receive tickets and notifications directly via Gmail with API integration
- **Cross-Department Routing**: Intelligent ticket routing between departments
- **Dashboard Analytics**: Officer and Admin dashboards with KPI cards and department breakdowns
- **Employee Self-Service**: Employees can track their requests without seeing internal operations

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React 18)                      │
│    - Dashboard (Admin/Officer/Employee views)                │
│    - Ticket Management UI                                    │
│    - Leave Request Forms                                     │
│    - Real-time Status Updates                                │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (Axios)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express)                     │
│    - REST API Endpoints                                      │
│    - Authentication (JWT)                                    │
│    - Database Operations (Mongoose)                          │
│    - Gmail API Integration                                   │
│    - File Upload/Storage                                     │
│    - RBAC Authorization                                      │
└────────────────────────┬────────────────────────────────────┘
                         │ Database Calls
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    ┌────────┐      ┌──────────┐     ┌────────────┐
    │ MongoDB│      │ File     │     │ AI Service │
    │Database│      │Storage   │     │(FastAPI)   │
    └────────┘      └──────────┘     └────────────┘
                                          │
                        ┌─────────────────┼─────────────────┐
                        ▼                 ▼                 ▼
                   ┌─────────┐      ┌──────────┐     ┌─────────┐
                   │LangChain│      │Document  │     │Sentiment│
                   │RAG      │      │Parser    │     │Analysis │
                   └─────────┘      └──────────┘     └─────────┘
```

---

## 🛠️ Tech Stack

| Component      | Technology                          |
|----------------|-------------------------------------|
| **Frontend**   | React 18, Vite, Axios, React Router|
| **Backend**    | Node.js 18+, Express, Mongoose     |
| **Database**   | MongoDB (Atlas or Local)            |
| **AI Service** | Python 3.11, FastAPI, LangChain    |
| **Auth**       | JWT (JSON Web Tokens)              |
| **Email**      | Gmail API v1                       |
| **File Proc.** | PDF extraction, Text processing    |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18 (download from [nodejs.org](https://nodejs.org/))
- **Python** >= 3.11 (download from [python.org](https://www.python.org/))
- **MongoDB** (local or free tier on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Git** for version control

### Step 1: Clone the Repository

```bash
git clone https://github.com/Hariprasathmani/kmrl-docusense.git
cd kmrl-docusense
```

### Step 2: Install Dependencies

#### Backend Setup
```bash
cd server
npm install
```

#### Frontend Setup
```bash
cd ../client
npm install
```

#### AI Service Setup
```bash
cd ../ai-service
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### Step 3: Configure Environment Variables

Create `.env` files in each directory by copying from `.env.example` templates:

#### Root `.env` (if applicable)
```bash
cp .env.example .env
```

#### Server `.env`
```bash
cp server/.env.example server/.env
```
**Required variables:**
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `GMAIL_CLIENT_ID` - Gmail API client ID
- `GMAIL_CLIENT_SECRET` - Gmail API client secret
- `GMAIL_REFRESH_TOKEN` - Gmail refresh token
- `ADMIN_EMAIL` - Admin account email

#### Client `.env`
```bash
cp client/.env.example client/.env
```
**Required variables:**
- `VITE_API_URL` - Backend API URL (usually `http://localhost:5000`)

#### AI Service `.env`
```bash
cp ai-service/.env.example ai-service/.env
```
**Required variables:**
- `GROQ_API_KEY` - Groq API key for LLM
- `MONGODB_URI` - Same MongoDB connection as backend

### Step 4: Set Up Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Desktop app)
5. Download credentials and configure in `server/.env`
6. Get refresh token using the authorization flow
7. Store credentials securely in `.env` (never commit real values)

For detailed instructions, see `server/docs/GMAIL_API_SETUP.md`

### Step 5: Run the Application

#### Terminal 1 - Start Backend
```bash
cd server
npm run dev
# Backend runs on http://localhost:5000
```

#### Terminal 2 - Start Frontend
```bash
cd client
npm run dev
# Frontend runs on http://localhost:5173
```

#### Terminal 3 - Start AI Service
```bash
cd ai-service
# Ensure venv is activated first
uvicorn main:app --reload --port 8000
# AI Service runs on http://localhost:8000
```

Visit **http://localhost:5173** in your browser to access the application.

---

## 🔐 Authentication & Roles

### User Roles

1. **Admin**
   - Full system access
   - Manage users and departments
   - View all tickets and requests
   - System configuration

2. **Officer**
   - Department-specific access
   - Resolve tickets in their department
   - View department analytics
   - Generate reports

3. **Viewer/Employee**
   - Submit tickets and leave requests
   - Track personal requests only
   - View own ticket history
   - Download request confirmations

### Login
- Default credentials provided in setup documentation
- Change passwords immediately after first login
- JWT tokens expire after 24 hours

---

## 📊 Key Workflows

### Ticket Workflow
1. Employee submits ticket with document upload
2. System classifies ticket by department
3. AI extracts key information
4. Ticket routes to responsible officer
5. Officer reviews and provides resolution
6. Employee receives notification with resolution
7. Real-time status updates every 5 seconds

### Leave Request Workflow
1. Employee submits leave request with dates
2. Request routes to HR
3. HR reviews eligibility and approves/rejects
4. Employee receives notification
5. Approved leaves added to calendar
6. Department sees employee unavailability

### Document Processing
1. Upload document (PDF, DOC, TXT)
2. AI extracts text and key information
3. Classification engine categorizes document
4. Summarization creates executive summary
5. RAG system enables intelligent search
6. Results stored for future reference

---

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Tickets
- `GET /api/tickets` - Get all tickets (admin/officer)
- `GET /api/tickets/:id` - Get ticket details
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket status
- `DELETE /api/tickets/:id` - Delete ticket

### Leave Requests
- `GET /api/leaves` - Get leave requests
- `POST /api/leaves` - Submit leave request
- `PUT /api/leaves/:id` - Approve/reject leave

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/:id/summary` - Get AI summary
- `GET /api/documents/search` - Search documents

See API documentation or Postman collection for complete endpoint list.

---

## 📁 Project Structure

```
kmrl-docusense/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API calls
│   │   ├── context/           # Auth context
│   │   └── main.jsx           # Entry point
│   └── package.json
│
├── server/                    # Node.js Backend
│   ├── models/                # MongoDB schemas
│   ├── routes/                # API endpoints
│   ├── controllers/           # Business logic
│   ├── middleware/            # Auth, validation
│   ├── services/              # Email, Gmail integration
│   ├── config/                # Database config
│   └── main.js                # App entry point
│
├── ai-service/                # Python AI Service
│   ├── classifier.py          # Document classification
│   ├── extractor.py           # Text extraction
│   ├── summarizer.py          # Document summarization
│   ├── rag.py                 # RAG implementation
│   ├── main.py                # FastAPI app
│   └── requirements.txt        # Python dependencies
│
└── README.md                  # This file
```

---

## 🧪 Testing

### Manual Testing
1. Create admin account
2. Create departments and officers
3. Test employee ticket submission
4. Verify email notifications
5. Test leave request workflow
6. Verify document processing accuracy

### Automated Tests (if implemented)
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test

# AI service tests
cd ai-service && pytest
```

---

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Verify MongoDB service is running
- Check `MONGODB_URI` in `.env`
- Ensure firewall allows MongoDB port (27017)
- For Atlas: Check IP whitelist in security settings

### Gmail API Errors
- Verify credentials in `.env`
- Check refresh token hasn't expired
- Ensure Gmail API is enabled in Google Cloud Console
- Check email sending service is initialized

### Frontend Won't Connect to Backend
- Verify backend is running on correct port
- Check `VITE_API_URL` in client `.env`
- Check CORS settings in server
- Verify no firewall blocking localhost:5000

### AI Service Crashes
- Check Groq API key validity
- Verify Python version >= 3.11
- Ensure all dependencies installed: `pip install -r requirements.txt`
- Check available disk space for document processing

---

## 📝 Environment Variables Reference

### Server `.env`
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kmrl-docusense
JWT_SECRET=your-secret-key-min-32-characters
GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=xxxx
GMAIL_REFRESH_TOKEN=xxxx
ADMIN_EMAIL=admin@kmrl.in
PORT=5000
NODE_ENV=development
```

### Client `.env`
```
VITE_API_URL=http://localhost:5000
```

### AI Service `.env`
```
GROQ_API_KEY=gsk_xxxxx
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kmrl-docusense
PORT=8000
```

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and test thoroughly
3. Commit with clear messages: `git commit -m "feat: add my feature"`
4. Push to your fork: `git push origin feature/my-feature`
5. Create a Pull Request with description

---

## 📄 License

Proprietary — Kochi Metro Rail Limited

All rights reserved. Unauthorized copying or use of this software is prohibited.

---

## 📞 Support

For issues, questions, or feature requests:
- Create an issue on GitHub
- Contact the development team
- Check existing documentation in `server/docs/`

---

## 🔄 Latest Updates

- **v1.0** - Initial release with ticket management, leave requests, and AI document processing
- Auto-refresh feature for real-time updates (5-second polling)
- Gmail API integration for email-based ticket submission
- RBAC system with three user roles
- Dashboard analytics for admins and officers
