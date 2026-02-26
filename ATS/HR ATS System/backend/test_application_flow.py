#!/usr/bin/env python
"""
Test the full application flow via API.
This script:
1. Logs in as a candidate
2. Gets available jobs
3. Applies with a resume
4. Verifies the application has extracted_text and parsed_data
"""

import sys
import os
import requests
from pathlib import Path

BASE_URL = "http://localhost:8000/api/v1"

def create_test_candidate():
    """Create a test candidate account."""
    # First check if it exists by trying to login
    test_credentials = {
        "username": "extraction_test_user@test.com",
        "password": "testpassword123"
    }
    
    # Try to login
    login_resp = requests.post(
        f"{BASE_URL}/auth/login",
        data=test_credentials
    )
    
    if login_resp.status_code == 200:
        print("✓ Test candidate already exists, logged in")
        return login_resp.json()["access_token"]
    
    # Create new candidate
    register_resp = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "name": "Extraction Test User",
            "email": "extraction_test_user@test.com",
            "password": "testpassword123",
            "role": "candidate"
        }
    )
    
    if register_resp.status_code == 200:
        print("✓ Created test candidate")
        # Login
        login_resp = requests.post(
            f"{BASE_URL}/auth/login",
            data=test_credentials
        )
        return login_resp.json()["access_token"]
    else:
        print(f"✗ Failed to create candidate: {register_resp.text}")
        return None


def get_first_job():
    """Get the first available job."""
    resp = requests.get(f"{BASE_URL}/jobs/")
    if resp.status_code == 200 and resp.json():
        job = resp.json()[0]
        print(f"✓ Found job: {job['title']} (ID: {job['_id']})")
        return job["_id"]
    else:
        print("✗ No jobs found")
        return None


def apply_with_resume(token: str, job_id: str, resume_path: str):
    """Apply for a job with a resume file."""
    headers = {"Authorization": f"Bearer {token}"}
    
    with open(resume_path, "rb") as f:
        files = {"file": (os.path.basename(resume_path), f, "application/pdf")}
        data = {"job_id": job_id}
        
        print(f"  Submitting application...")
        resp = requests.post(
            f"{BASE_URL}/applications/apply",
            headers=headers,
            files=files,
            data=data
        )
    
    if resp.status_code == 200:
        return resp.json()
    else:
        print(f"✗ Application failed: {resp.status_code} - {resp.text}")
        return None


def main():
    print("\n" + "="*70)
    print("FULL APPLICATION FLOW TEST")
    print("="*70)
    
    # 1. Find a PDF to test with
    uploads_dir = Path(__file__).parent / "uploads"
    pdf_files = list(uploads_dir.glob("*.pdf"))
    
    if not pdf_files:
        print("✗ No PDF files found in uploads directory")
        return
    
    test_pdf = pdf_files[0]
    print(f"✓ Using test PDF: {test_pdf.name}")
    
    # 2. Create/login test candidate
    token = create_test_candidate()
    if not token:
        print("✗ Could not get auth token")
        return
    
    # 3. Get first job
    job_id = get_first_job()
    if not job_id:
        print("✗ Could not find a job to apply for")
        return
    
    # 4. Apply with resume
    print(f"\n--- Applying for job {job_id} ---")
    application = apply_with_resume(token, job_id, str(test_pdf))
    
    if not application:
        return
    
    # 5. Check the results
    print("\n" + "="*70)
    print("APPLICATION RESULT")
    print("="*70)
    
    extracted_text = application.get("extracted_text", "")
    parsed_data = application.get("parsed_data", {})
    scoring = application.get("scoring", {})
    
    print(f"\n1. EXTRACTION STATUS:")
    if extracted_text and len(extracted_text) > 50:
        print(f"   ✓ extracted_text: {len(extracted_text)} characters")
        print(f"   Preview: {extracted_text[:100]}...")
    else:
        print(f"   ✗ extracted_text is EMPTY or too short!")
    
    print(f"\n2. PARSING STATUS:")
    if parsed_data:
        print(f"   ✓ parsed_data has {len(parsed_data)} fields")
        print(f"   Name: {parsed_data.get('name')}")
        print(f"   Skills: {len(parsed_data.get('skills', []))} found")
        print(f"   Education: {parsed_data.get('education')}")
        print(f"   Experience Years: {parsed_data.get('experience_years')}")
    else:
        print(f"   ✗ parsed_data is EMPTY!")
    
    print(f"\n3. SCORING STATUS:")
    if scoring:
        print(f"   ✓ Scoring completed")
        print(f"   Final Score: {scoring.get('final_score')}/100")
        print(f"   Skill Score: {scoring.get('skill_score')}/100")
        print(f"   Experience Score: {scoring.get('experience_score')}/100")
        print(f"   Matched Skills: {scoring.get('matched_skills')}")
        print(f"   Missing Skills: {scoring.get('missing_skills')}")
    else:
        print(f"   ✗ Scoring FAILED!")
    
    # Summary
    print("\n" + "="*70)
    extraction_ok = len(extracted_text) > 50
    parsing_ok = bool(parsed_data and parsed_data.get('skills'))
    scoring_ok = bool(scoring and scoring.get('final_score', 0) > 0)
    
    if extraction_ok and parsing_ok and scoring_ok:
        print("✓ ALL TESTS PASSED - Resume extraction and scoring working!")
    else:
        print("✗ SOME TESTS FAILED:")
        if not extraction_ok:
            print("  - Extraction failed (extracted_text is empty)")
        if not parsing_ok:
            print("  - Parsing failed (parsed_data is empty)")
        if not scoring_ok:
            print("  - Scoring failed")
    print("="*70)


if __name__ == "__main__":
    main()
