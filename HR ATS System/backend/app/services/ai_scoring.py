import google.generativeai as genai
from sentence_transformers import SentenceTransformer, util
from app.core.config import settings
import numpy as np
import re

# Initialize models
model = None
embedding_model = None

def get_embedding_model():
    global embedding_model
    if embedding_model is None:
        try:
            print("Loading SentenceTransformer model...")
            embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            print("SentenceTransformer model loaded.")
        except Exception as e:
            print(f"Error loading SentenceTransformer: {e}")
            embedding_model = None
    return embedding_model

def get_gemini_model():
    global model
    if model is None:
        try:
            if settings.GEMINI_API_KEY:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel('gemini-pro')
            else:
                print("Warning: GEMINI_API_KEY not set. AI features will use mock data.")
        except Exception as e:
            print(f"Error initializing Gemini: {e}")
            model = None
    return model

def calculate_rule_score(resume_text: str, job_description: str, required_skills: list[str]) -> float:
    # Basic rule-based matching
    score = 0
    resume_text_lower = resume_text.lower()
    
    # 1. Skill Matching (50 points)
    matched_skills = 0
    for skill in required_skills:
        if skill.lower() in resume_text_lower:
            matched_skills += 1
    
    if required_skills:
        skill_score = (matched_skills / len(required_skills)) * 50
    else:
        skill_score = 50 # Default if no skills required
        
    score += skill_score
    
    # 2. Basic keyword frequency (simulated) (30 points)
    # This is a simplification. In real world, we'd extract keywords from JD.
    
    # 3. Education/Experience (20 points) - Keyword search
    if "bachelor" in resume_text_lower or "master" in resume_text_lower or "degree" in resume_text_lower:
        score += 10
    if "years" in resume_text_lower or "experience" in resume_text_lower:
        score += 10
        
    return min(100.0, score)

def calculate_semantic_score(resume_text: str, job_description: str) -> float:
    model = get_embedding_model()
    if not model:
        return 0.0
        
    embeddings1 = model.encode(resume_text, convert_to_tensor=True)
    embeddings2 = model.encode(job_description, convert_to_tensor=True)
    
    cosine_scores = util.cos_sim(embeddings1, embeddings2)
    score = cosine_scores.item() * 100
    return max(0.0, min(100.0, score))

async def evaluate_application(resume_text: str, job_description: str, required_skills: list[str]):
    rule_score = calculate_rule_score(resume_text, job_description, required_skills)
    semantic_score = calculate_semantic_score(resume_text, job_description)
    
    # Final Score = (0.4 * Rule Score) + (0.6 * Semantic Score)
    final_score = (0.4 * rule_score) + (0.6 * semantic_score)
    
    return {
        "rule_score": round(rule_score, 2),
        "semantic_score": round(semantic_score, 2),
        "final_score": round(final_score, 2)
    }

async def generate_summary(resume_text: str) -> str:
    model = get_gemini_model()
    if not model:
        return "AI Summary not available (API Key missing)."
    
    try:
        response = model.generate_content(f"Summarize this resume in 3 sentences: {resume_text[:2000]}")
        return response.text
    except Exception as e:
        return f"Error generating summary: {e}"
