#!/usr/bin/env python
"""Check MongoDB for applications and their scores."""

import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient

async def check_db():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['hr_ats_db']
    
    # Check applications
    apps = await db.applications.find().to_list(10)
    print(f'Found {len(apps)} applications in database\n')
    
    for i, app in enumerate(apps):
        print(f'App {i+1}:')
        print(f'  Candidate: {app.get("candidate_name")}')
        print(f'  Score: {app.get("score", app.get("final_score"))}')
        print(f'  Full Score: {app.get("final_score")}')
        
        # Check if scoring breakdown exists
        if 'scoring' in app:
            scoring = app['scoring']
            print(f'  Scoring breakdown:')
            print(f'    Skill: {scoring.get("skill_score")}')
            print(f'    Experience: {scoring.get("experience_score")}')
            print(f'    Education: {scoring.get("education_score")}')
            print(f'    Semantic: {scoring.get("semantic_score")}')
        
        # Check parsed data
        if 'parsed_data' in app:
            parsed = app['parsed_data']
            print(f'  Parsed data:')
            print(f'    Name: {parsed.get("name")}')
            print(f'    Experience Years: {parsed.get("experience_years")}')
            print(f'    Skills: {len(parsed.get("skills", []))} found')
        print()

if __name__ == "__main__":
    asyncio.run(check_db())
