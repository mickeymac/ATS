#!/usr/bin/env python
"""Quick test to verify extraction is working."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.resume_extractor import extract_text_from_bytes, extract_candidate_info

def test_extraction():
    uploads_dir = 'uploads'
    pdf_files = [f for f in os.listdir(uploads_dir) if f.endswith('.pdf')]
    
    if not pdf_files:
        print('No PDF files found in uploads/')
        return
    
    for pdf_file in pdf_files[:3]:  # Test first 3 PDFs
        pdf_path = os.path.join(uploads_dir, pdf_file)
        print(f'\n{"="*60}')
        print(f'Testing: {pdf_file}')
        print(f'{"="*60}')
        
        try:
            with open(pdf_path, 'rb') as f:
                content = f.read()
            
            text = extract_text_from_bytes(content, pdf_file)
            print(f'✓ Extracted text length: {len(text)} chars')
            
            if len(text) > 0:
                print(f'  Preview: {text[:150]}...')
                
                parsed = extract_candidate_info(text)
                print(f'  Name: {parsed.get("name")}')
                print(f'  Email: {parsed.get("email")}')
                print(f'  Phone: {parsed.get("phone")}')
                print(f'  Skills ({len(parsed.get("skills", []))}): {parsed.get("skills", [])[:5]}...')
                print(f'  Experience years: {parsed.get("experience_years")}')
                print(f'  Education: {parsed.get("education")}')
            else:
                print('✗ Empty text extracted!')
                
        except Exception as e:
            print(f'✗ Error: {e}')
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_extraction()
