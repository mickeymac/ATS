#!/usr/bin/env python
"""
Test script to verify resume extraction is working properly.
Run from backend directory: python test_extraction.py
"""

import sys
import os
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.resume_extractor import extract_text_from_bytes, extract_candidate_info

def test_extraction_from_file(file_path: str):
    """Test extraction from a file on disk."""
    print(f"\n{'='*60}")
    print(f"Testing extraction from: {file_path}")
    print(f"{'='*60}")
    
    if not os.path.exists(file_path):
        print(f"✗ File not found: {file_path}")
        return False
    
    # Read file content
    with open(file_path, 'rb') as f:
        content = f.read()
    
    print(f"✓ Read {len(content)} bytes from file")
    
    # Extract text
    try:
        filename = os.path.basename(file_path)
        extracted_text = extract_text_from_bytes(content, filename)
        print(f"✓ Extracted {len(extracted_text)} characters")
        print(f"  Preview: {extracted_text[:200]}...")
    except Exception as e:
        print(f"✗ Extraction failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Parse candidate info
    try:
        parsed_data = extract_candidate_info(extracted_text)
        print(f"\n✓ Parsed candidate data:")
        print(f"  Name: {parsed_data.get('name')}")
        print(f"  Email: {parsed_data.get('email')}")
        print(f"  Phone: {parsed_data.get('phone')}")
        print(f"  Experience Years: {parsed_data.get('experience_years')}")
        print(f"  Education: {parsed_data.get('education')}")
        print(f"  Skills ({len(parsed_data.get('skills', []))}): {parsed_data.get('skills')[:10]}...")
    except Exception as e:
        print(f"✗ Parsing failed: {e}")
        return False
    
    return True


def main():
    print("\n" + "="*60)
    print("RESUME EXTRACTION TEST")
    print("="*60)
    
    # Try to find PDF files in uploads folder
    uploads_dir = Path(__file__).parent / "uploads"
    
    if not uploads_dir.exists():
        print(f"✗ Uploads directory not found: {uploads_dir}")
        return
    
    pdf_files = list(uploads_dir.glob("*.pdf"))
    docx_files = list(uploads_dir.glob("*.docx"))
    all_files = pdf_files + docx_files
    
    if not all_files:
        print(f"✗ No PDF or DOCX files found in {uploads_dir}")
        print("  Please upload a resume first via the application.")
        return
    
    print(f"Found {len(all_files)} file(s) to test:")
    for f in all_files:
        print(f"  - {f.name}")
    
    # Test each file
    success_count = 0
    for file_path in all_files:
        if test_extraction_from_file(str(file_path)):
            success_count += 1
    
    print(f"\n{'='*60}")
    print(f"RESULTS: {success_count}/{len(all_files)} files extracted successfully")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
