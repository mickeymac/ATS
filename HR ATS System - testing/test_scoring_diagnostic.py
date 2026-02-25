#!/usr/bin/env python
"""
Diagnostic script to test resume extraction and scoring.
This will help identify why both resumes get the same score.
"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.services.resume_extractor import extract_text_from_file, extract_candidate_info
from app.services.scoring_engine import ResumeScorer
from fastapi import UploadFile
from unittest.mock import Mock
import asyncio

async def test_resume(file_path: str, job_data: dict):
    """Test extraction and scoring on a single resume."""
    file_path = Path(file_path)
    
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return None
    
    print(f"\n{'='*70}")
    print(f"Testing: {file_path.name}")
    print(f"{'='*70}")
    
    try:
        # Create mock UploadFile
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = file_path.name
        mock_file.content_type = "application/pdf" if file_path.suffix.lower() == ".pdf" else \
                                 "application/vnd.openxmlformats-officedocument.wordprocessingml.document" if file_path.suffix.lower() == ".docx" else \
                                 "text/plain"
        
        # Read file content
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Mock read() method
        async def mock_read():
            return content
        
        mock_file.read = mock_read
        
        # Extract text
        print("\n1️⃣  EXTRACTION PHASE")
        print("-" * 70)
        try:
            extracted_text = await extract_text_from_file(mock_file)
            print(f"✓ Text extracted successfully")
            print(f"  Length: {len(extracted_text)} chars")
            print(f"  Preview: {extracted_text[:200]}...")
        except Exception as e:
            print(f"❌ Extraction failed: {e}")
            return None
        
        # Parse candidate info
        print("\n2️⃣  PARSING PHASE")
        print("-" * 70)
        try:
            parsed_data = extract_candidate_info(extracted_text)
            print(f"✓ Candidate info extracted:")
            print(f"  Name: {parsed_data.get('name')}")
            print(f"  Email: {parsed_data.get('email')}")
            print(f"  Phone: {parsed_data.get('phone')}")
            print(f"  LinkedIn: {parsed_data.get('linkedin_url')}")
            print(f"  GitHub: {parsed_data.get('github_url')}")
            print(f"  Experience Years: {parsed_data.get('experience_years')}")
            print(f"  Education: {parsed_data.get('education')}")
            print(f"  Skills ({len(parsed_data.get('skills', []))}): {parsed_data.get('skills')}")
        except Exception as e:
            print(f"❌ Parsing failed: {e}")
            parsed_data = {}
        
        # Score application
        print("\n3️⃣  SCORING PHASE")
        print("-" * 70)
        try:
            scorer = ResumeScorer()
            scoring_result = scorer.score_application(parsed_data, extracted_text, job_data)
            
            print(f"✓ Scoring completed:")
            print(f"  Skill Score: {scoring_result['skill_score']:.1f}/100")
            print(f"  Experience Score: {scoring_result['experience_score']:.1f}/100")
            print(f"  Education Score: {scoring_result['education_score']:.1f}/100")
            print(f"  Semantic Score: {scoring_result['semantic_score']:.1f}/100")
            print(f"  -" * 35)
            print(f"  FINAL SCORE: {scoring_result['final_score']:.1f}/100")
            print(f"  ")
            print(f"  Matched Skills: {scoring_result['matched_skills']}")
            print(f"  Missing Skills: {scoring_result['missing_skills']}")
            print(f"  Skill Coverage: {scoring_result['skill_coverage']:.1f}%")
            
            return {
                "file": file_path.name,
                "extracted_text": extracted_text,
                "parsed_data": parsed_data,
                "scoring": scoring_result
            }
        except Exception as e:
            print(f"❌ Scoring failed: {e}")
            import traceback
            traceback.print_exc()
            return None
            
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return None

async def main():
    """Main diagnostic function."""
    # Define job data similar to what's in the database
    job_data = {
        "title": "Backend Engineer",
        "description": "Build APIs with FastAPI and MongoDB",
        "required_skills": ["FastAPI", "MongoDB", "Python"],
        "weighted_skills": None,
        "experience_required": 3,
        "education_required": None
    }
    
    print("\n" + "="*70)
    print("RESUME SCORING DIAGNOSTIC TEST")
    print("="*70)
    print(f"Job: {job_data['title']}")
    print(f"Required Skills: {job_data['required_skills']}")
    print(f"Required Experience: {job_data['experience_required']} years")
    
    # Test with different resume files
    uploads_dir = Path(__file__).parent / "backend" / "uploads"
    
    # Get list of PDF and DOCX files (not TXT since we don't support them)
    resume_files = sorted([
        f for f in uploads_dir.glob("*.pdf") or [] if f.is_file()
    ])[:2]  # Test first 2 PDFs
    
    if not resume_files:
        # Try DOCX files if no PDFs
        resume_files = sorted([
            f for f in uploads_dir.glob("*.docx") if f.is_file()
        ])[:2]
    
    print(f"\nTesting {len(resume_files)} resume(s)...")
    
    results = []
    for resume_file in resume_files:
        result = await test_resume(str(resume_file), job_data)
        if result:
            results.append(result)
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    
    if len(results) >= 2:
        score1 = results[0]['scoring']['final_score']
        score2 = results[1]['scoring']['final_score']
        
        print(f"\nResume 1 ({results[0]['file']}): {score1:.1f}/100")
        print(f"Resume 2 ({results[1]['file']}): {score2:.1f}/100")
        
        if abs(score1 - score2) < 0.01:
            print("\n⚠️  WARNING: Both resumes have IDENTICAL scores!")
            print("\nPOSSIBLE CAUSES:")
            print("1. Extraction is failing for both (empty text)")
            print("2. Parsed data is empty for both")
            print("3. Scoring formula is not differentiating between candidates")
            
            # Check if parsed data is empty
            if not results[0]['parsed_data'].get('skills') and not results[1]['parsed_data'].get('skills'):
                print("\n✓ ROOT CAUSE: Skills not being extracted from resumes")
                print("  This is why both get the same default score!")
        else:
            print(f"\n✓ Scores are DIFFERENT (difference: {abs(score1-score2):.1f})")
    
    print(f"\nDetailed results saved for analysis.")
    
    # Save results to file for deeper analysis
    with open("diagnostic_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"Saved to: diagnostic_results.json")

if __name__ == "__main__":
    asyncio.run(main())
