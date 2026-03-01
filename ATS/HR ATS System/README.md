# AI-Powered Applicant Tracking System (ATS)

A production-ready ATS with role-based access, resume analysis using AI (Gemini), and automated workflows.

## Tech Stack

**Frontend:**
- React (Vite)
- Tailwind CSS
- React Router DOM
- Recharts
- Axios

**Backend:**
- FastAPI (Python)
- MongoDB (Motor Async Driver)
- JWT Authentication
- Google Gemini API (Resume Summarization)
- Sentence Transformers (Semantic Matching)

## Features

- **Role-Based Access Control (RBAC):** Admin, Team Lead, Recruiter.
- **Resume Parsing:** PDF and DOCX text extraction.
- **AI Scoring:** 
    - Rule-based matching (Skills, Experience).
    - Semantic matching (Sentence Embeddings).
    - Weighted final score.
- **Dashboards:**
    - Team Lead/Recruiter: Analytics, Job Management, Application Review.
    - Admin: User Management.

## Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 16+
- MongoDB Instance (Local or Atlas)
- Google Gemini API Key (Optional, for AI features)

### Backend Setup

1. Navigate to backend:
   ```bash
   cd backend
   ```

2. Create virtual environment and activate:
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure Environment Variables:
   - Edit `.env` file.
   - Set `MONGODB_URL`, `GEMINI_API_KEY`, etc.

5. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```
   Server runs at `http://localhost:8000`. API Docs at `http://localhost:8000/docs`.

### Frontend Setup

1. Navigate to frontend:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:5173`.

## Default Roles
- Register a new user.
- Select "Admin", "Team Lead", or "Recruiter" from the registration page.
- Role Hierarchy: Admin → Team Lead → Recruiter
- Note: In a real production system, Admin registration should be restricted. Here it is open for demonstration.

## AI Configuration
To enable AI features, ensure you have a valid `GEMINI_API_KEY` in `backend/.env`.
If not provided, the system will skip AI summarization but semantic scoring (using local Sentence Transformers) will still work if the model downloads successfully.


LLM :- sentence-transformers/all-MiniLM-L6-v2

backend cmd :- Set-Location "c:/Users/91972/Desktop/projects/HR ATS System/backend"; & "C:/Users/91972/Desktop/projects/HR ATS System/venv/Scripts/python.exe" -m uvicorn app.main:app --reload