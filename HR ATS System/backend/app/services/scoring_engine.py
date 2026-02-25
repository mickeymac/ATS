"""
Production-grade resume scoring engine with explainable, structured scoring.

Final Score Formula:
Final Score = (0.35 × Weighted Skill Score)
            + (0.25 × Experience Score)
            + (0.10 × Education Score)
            + (0.30 × Section-Based Semantic Score)

All scores normalized to 0-100 scale.
"""

import re
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from sentence_transformers import SentenceTransformer

# Initialize sentence transformer once (lazy load)
_embedding_model = None


def get_embedding_model():
    """Lazy-load the embedding model."""
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _embedding_model


def normalize_vector(vec: np.ndarray) -> np.ndarray:
    """Normalize a vector to unit length."""
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm


def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Compute cosine similarity between two normalized vectors."""
    vec1_norm = normalize_vector(vec1)
    vec2_norm = normalize_vector(vec2)
    return float(np.dot(vec1_norm, vec2_norm))


class ResumeScorer:
    """Production-grade resume scoring engine."""
    
    def __init__(self):
        self.embedding_model = get_embedding_model()
    
    def score_application(
        self,
        parsed_candidate_data: Dict[str, Any],
        resume_text: str,
        job_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Score an application based on candidate data and job requirements.
        
        Returns:
        {
            "skill_score": float,
            "experience_score": float,
            "education_score": float,
            "semantic_score": float,
            "final_score": float,
            "matched_skills": List[str],
            "missing_skills": List[str],
            "skill_coverage": float,
            "experience_match": float,
            "semantic_similarity": float,
            "breakdown": Dict explaining each component
        }
        """
        
        # Ensure parsed_candidate_data is valid dict
        if not parsed_candidate_data:
            parsed_candidate_data = {}
        
        # Extract scoring components
        job_required_skills = job_data.get('weighted_skills', []) or job_data.get('required_skills', [])
        job_experience_years = job_data.get('experience_required', 0)
        job_education = job_data.get('education_required', None)
        job_description = job_data.get('description', '')
        
        # 1. SKILL SCORING
        skill_result = self._score_skills(
            parsed_candidate_data.get('skills', []),
            job_required_skills,
            resume_text
        )
        
        # 2. EXPERIENCE SCORING
        experience_score = self._score_experience(
            parsed_candidate_data.get('experience_years', 0),
            job_experience_years
        )
        
        # 3. EDUCATION SCORING
        education_score = self._score_education(
            parsed_candidate_data.get('education', []),
            job_education
        )
        
        # 4. SEMANTIC SCORING
        semantic_score = self._score_semantic(
            parsed_candidate_data,
            resume_text,
            job_data
        )
        
        # 5. FINAL SCORE (weighted combination)
        # Adjusted weights: 35% skill, 25% exp, 10% edu, 30% semantic
        final_score = (
            0.35 * skill_result['skill_score'] +
            0.25 * experience_score +
            0.10 * education_score +
            0.30 * semantic_score
        )
        final_score = self._clamp_score(final_score)
        
        return {
            "skill_score": self._clamp_score(skill_result['skill_score']),
            "experience_score": self._clamp_score(experience_score),
            "education_score": self._clamp_score(education_score),
            "semantic_score": self._clamp_score(semantic_score),
            "final_score": final_score,
            "matched_skills": skill_result['matched_skills'],
            "missing_skills": skill_result['missing_skills'],
            "skill_coverage": skill_result['skill_coverage'],
            "experience_match": self._clamp_score((
                100 if parsed_candidate_data.get('experience_years', 0) >= job_experience_years
                else (parsed_candidate_data.get('experience_years', 0) / max(job_experience_years, 1)) * 100
            )),
            "breakdown": {
                "skill_component": skill_result['skill_score'] * 0.35,
                "experience_component": experience_score * 0.25,
                "education_component": education_score * 0.10,
                "semantic_component": semantic_score * 0.30,
            }
        }
    
    def _score_skills(
        self,
        candidate_skills: List[str],
        job_required_skills: List,
        resume_text: str
    ) -> Dict[str, Any]:
        """
        Score skills using weighted matching.
        
        job_required_skills can be:
        - List[str]: skill names (default weight = 1.0)
        - List[Dict]: [{"name": "python", "weight": 10}, ...]
        """
        
        candidate_skills_lower = [s.lower() for s in candidate_skills]
        
        # Normalize job skills to weighted format
        weighted_job_skills = []
        total_possible_weight = 0.0
        
        if job_required_skills:
            if isinstance(job_required_skills[0], dict):
                # Already weighted
                weighted_job_skills = job_required_skills
                total_possible_weight = sum(s.get('weight', 1.0) for s in weighted_job_skills)
            else:
                # Convert to weighted (equal weight = 1.0)
                weighted_job_skills = [
                    {"name": s.lower(), "weight": 1.0}
                    for s in job_required_skills
                ]
                total_possible_weight = float(len(weighted_job_skills))
        
        if total_possible_weight == 0:
            return {
                "skill_score": 50.0,  # Default if no skills required
                "matched_skills": [],
                "missing_skills": [],
                "skill_coverage": 0.0
            }
        
        # Match candidate skills against job requirements
        matched_skills = []
        matched_weight = 0.0
        missing_skills = []
        
        for job_skill in weighted_job_skills:
            skill_name = job_skill.get('name', '').lower()
            skill_weight = job_skill.get('weight', 1.0)
            
            # Check if skill is in candidate skills or resume text
            skill_found = (
                skill_name in candidate_skills_lower or
                skill_name in resume_text.lower()
            )
            
            if skill_found:
                matched_skills.append(job_skill.get('name', skill_name))
                matched_weight += skill_weight
            else:
                missing_skills.append(job_skill.get('name', skill_name))
        
        skill_coverage = (matched_weight / total_possible_weight) * 100
        skill_score = skill_coverage  # Already normalized to 0-100
        
        return {
            "skill_score": skill_score,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "skill_coverage": skill_coverage
        }
    
    def _score_experience(
        self,
        candidate_years: float,
        required_years: float
    ) -> float:
        """
        Score experience based on years.
        If no requirement set (0), give neutral 50
        If no candidate experience found (0), give 0
        If candidate_years >= required_years: 100
        Else: (candidate_years / required_years) * 100
        """
        # If no requirement specified, give neutral score
        if required_years == 0:
            # But if candidate has no experience either, give lower score
            if candidate_years == 0:
                return 50.0  # Neutral when both are 0
            return 100.0  # Full marks if candidate has experience and no req
        
        # If candidate has no experience but job requires it
        if candidate_years == 0:
            return 0.0
        
        if candidate_years >= required_years:
            return 100.0
        
        score = (candidate_years / required_years) * 100
        return score
    
    def _score_education(
        self,
        candidate_education: List[str],
        required_education: Optional[str]
    ) -> float:
        """
        Score education match.
        Check if candidate has relevant degree keywords.
        """
        # If no education requirement, check if candidate has any education
        if not required_education or required_education.lower() in ['any', 'none', '']:
            if not candidate_education:
                return 30.0  # No education found, low score
            return 70.0  # Has some education, good score
        
        if not candidate_education:
            return 0.0  # Required but not found
        
        # Normalize inputs
        required_lower = required_education.lower()
        candidate_lower = [e.lower() for e in candidate_education]
        
        # Check for degree match
        degree_hierarchy = {
            'phd': 100,
            'master': 90,
            'bachelor': 80,
            'associate': 60,
            'diploma': 40,
        }
        
        max_score = 0.0
        for candidate_deg in candidate_lower:
            if 'phd' in required_lower and 'phd' in candidate_deg:
                max_score = 100.0
            elif 'master' in required_lower and ('master' in candidate_deg or 'msc' in candidate_deg):
                max_score = max(max_score, 90.0)
            elif 'bachelor' in required_lower and ('bachelor' in candidate_deg or 'bsc' in candidate_deg or 'bs' in candidate_deg):
                max_score = max(max_score, 80.0)
            elif candidate_deg in required_lower or required_lower in candidate_deg:
                max_score = max(max_score, 70.0)
        
        return max_score if max_score > 0 else 30.0  # Partial credit if has any degree
    
    def _score_semantic(
        self,
        parsed_candidate_data: Dict[str, Any],
        resume_text: str,
        job_data: Dict[str, Any]
    ) -> float:
        """
        Score semantic similarity using section-wise embeddings.
        
        Embeds:
        - Skills section vs job required skills
        - Experience section vs job description/responsibilities
        - Projects section vs job description
        
        Averages the similarities.
        """
        try:
            similarities = []
            
            # 1. Skills similarity
            candidate_skills_text = " ".join(parsed_candidate_data.get('skills', []))
            job_skills_text = " ".join(
                [s.get('name', s) if isinstance(s, dict) else s
                 for s in job_data.get('weighted_skills', []) or job_data.get('required_skills', [])]
            )
            
            if candidate_skills_text and job_skills_text:
                skill_sim = self._compute_semantic_similarity(candidate_skills_text, job_skills_text)
                similarities.append(skill_sim)
            
            # 2. Experience similarity
            candidate_experience_text = resume_text[
                max(0, resume_text.lower().find('experience')) :
                max(0, resume_text.lower().find('education'))
            ] if 'experience' in resume_text.lower() else resume_text[:500]
            
            job_description = job_data.get('description', '')
            if candidate_experience_text and job_description:
                exp_sim = self._compute_semantic_similarity(candidate_experience_text, job_description)
                similarities.append(exp_sim)
            
            # 3. Projects similarity (if exists)
            if 'projects' in resume_text.lower():
                projects_start = resume_text.lower().find('projects')
                projects_text = resume_text[projects_start:projects_start+1000]
                if projects_text and job_description:
                    proj_sim = self._compute_semantic_similarity(projects_text, job_description)
                    similarities.append(proj_sim)
            
            # Average similarities
            if similarities:
                semantic_score = (sum(similarities) / len(similarities)) * 100
            else:
                semantic_score = 50.0  # Default if embedding fails
            
            return semantic_score
        
        except Exception as e:
            print(f"Semantic scoring error: {e}")
            return 50.0  # Fallback
    
    def _compute_semantic_similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity between two text segments.
        Returns value between 0 and 1.
        """
        try:
            # Truncate long texts to avoid memory issues
            max_len = 512
            text1 = text1[:max_len] if text1 else ""
            text2 = text2[:max_len] if text2 else ""
            
            if not text1 or not text2:
                return 0.0
            
            embeddings = self.embedding_model.encode([text1, text2], convert_to_numpy=True)
            similarity = cosine_similarity(embeddings[0], embeddings[1])
            return float(similarity)
        except Exception as e:
            print(f"Embedding error: {e}")
            return 0.0
    
    def _score_formatting(
        self,
        parsed_candidate_data: Dict[str, Any],
        resume_text: str
    ) -> Dict[str, Any]:
        """
        Score resume formatting and completeness.
        Checks for:
        - Contact information (email, phone)
        - LinkedIn profile
        - Resume length
        - Professional structure
        """
        score = 100.0
        issues = []
        
        # 1. Email check (critical)
        email = parsed_candidate_data.get('email', '')
        if not email:
            score -= 25
            issues.append("Email address missing from resume")
        
        # 2. Phone check (important)
        phone = parsed_candidate_data.get('phone', '')
        if not phone:
            score -= 20
            issues.append("Phone number missing from resume")
        
        # 3. LinkedIn profile (recommended)
        linkedin = parsed_candidate_data.get('linkedin_url', '')
        if not linkedin:
            score -= 10
            issues.append("LinkedIn profile link recommended")
        
        # 4. GitHub profile (nice to have for tech roles)
        github = parsed_candidate_data.get('github_url', '')
        if not github:
            score -= 5
            issues.append("GitHub profile link would strengthen your application")
        
        # 5. Resume length check
        min_length = 500
        if len(resume_text) < min_length:
            score -= 20
            issues.append("Resume content appears too short. Add more details about experience and projects.")
        elif len(resume_text) < 1000:
            score -= 10
            issues.append("Consider adding more detail to your resume")
        
        # 6. Has name
        name = parsed_candidate_data.get('name', '')
        if not name or name == "Unknown":
            score -= 10
            issues.append("Name not clearly identified at the start of resume")
        
        # 7. Has skills listed
        skills = parsed_candidate_data.get('skills', [])
        if not skills:
            score -= 10
            issues.append("No skills section identified. Add a clear 'Skills' section")
        
        return {
            "formatting_score": max(0.0, score),
            "formatting_issues": issues
        }
    
    def _generate_recommendations(
        self,
        skill_result: Dict[str, Any],
        experience_score: float,
        education_score: float,
        semantic_score: float,
        formatting_issues: List[str],
        required_experience_years: float
    ) -> List[str]:
        """
        Generate actionable recommendations based on scoring results.
        """
        recommendations = []
        
        # Skill recommendations
        missing_skills = skill_result.get('missing_skills', [])
        if missing_skills:
            top_missing = missing_skills[:5]
            recommendations.append(f"Consider adding these key skills: {', '.join(str(s) for s in top_missing)}")
        
        skill_score = skill_result.get('skill_score', 0)
        if skill_score < 50:
            recommendations.append("Your skill set has limited overlap with job requirements. Consider skill development.")
        
        # Experience recommendations
        if experience_score < 70:
            recommendations.append(f"The role requires more experience. Highlight relevant projects that demonstrate expertise.")
        
        # Education recommendations
        if education_score < 50:
            recommendations.append("Education requirements may not be fully met. Highlight relevant certifications or training.")
        
        # Semantic recommendations
        if semantic_score < 50:
            recommendations.append("Tailor your resume to better match the job description keywords and responsibilities.")
        
        # Add formatting issues as recommendations
        recommendations.extend(formatting_issues[:3])
        
        # General recommendations if score is good
        if not recommendations:
            recommendations.append("Your profile is a strong match for this position!")
        
        return recommendations[:7]  # Limit to top 7 recommendations
    
    @staticmethod
    def _clamp_score(value: float) -> float:
        """Clamp score to 0-100 range."""
        return max(0.0, min(100.0, value))


async def evaluate_application_v2(
    parsed_candidate_data: Dict[str, Any],
    resume_text: str,
    job_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluate a candidate application using the production-grade scorer.
    
    Returns scoring breakdown with all metrics.
    """
    scorer = ResumeScorer()
    return scorer.score_application(parsed_candidate_data, resume_text, job_data)
