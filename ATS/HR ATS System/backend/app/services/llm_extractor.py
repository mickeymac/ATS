"""
LLM-based Resume and JD extraction service using HuggingFace Mistral-7B.
Falls back to regex extraction if LLM fails.
"""

import os
import re
import json
import logging
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# LLM initialization
_llm_model = None
_llm_available = False


def get_llm():
    """Lazy-load the HuggingFace LLM model."""
    global _llm_model, _llm_available
    
    if _llm_model is not None:
        return _llm_model
    
    try:
        from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
        
        api_token = os.getenv("HUGGINGFACEHUB_API_TOKEN", "")
        if not api_token:
            logger.warning("HUGGINGFACEHUB_API_TOKEN not set. LLM extraction disabled.")
            _llm_available = False
            return None
        
        _llm_model = ChatHuggingFace(
            llm=HuggingFaceEndpoint(
                repo_id="mistralai/Mistral-7B-Instruct-v0.2",
                task="conversational",
                huggingfacehub_api_token=api_token
            )
        )
        _llm_available = True
        logger.info("HuggingFace LLM model loaded successfully.")
        return _llm_model
    except Exception as e:
        logger.error(f"Failed to load HuggingFace LLM: {e}")
        _llm_available = False
        return None


def is_llm_available() -> bool:
    """Check if LLM is available."""
    global _llm_available
    if _llm_model is None:
        get_llm()
    return _llm_available


class LLMResumeExtractor:
    """
    LLM-based resume data extraction with regex fallback.
    """
    
    RESUME_EXTRACTION_PROMPT = """
You are an expert ATS (Applicant Tracking System) parser.
Extract structured data from the following Resume text.

Return ONLY a valid JSON object. Do not add any markdown formatting (like ```json).

Fields to extract:
- name: ONLY the person's full name (first, middle, last). Do NOT include address, phone, symbols like +, #, or any other text. Example: "John Smith" or "Syed Ahmed Zaid"
- email: Email address (string)
- phone: Phone number (string)
- linkedin_url: LinkedIn profile URL (string or empty)
- github_url: GitHub profile URL (string or empty)
- skills: List of technical and professional skills (list of strings)
- experience_years: Total years of experience as a float number (e.g. 0.5 for 6 months, 1.5 for 18 months)
- experience_months: Total months of experience as an integer (e.g. 6, 18, 24)
- education: List of EXACT degree names found in resume (e.g. ["MCA", "BCA", "B.Tech Computer Science"]). Only include actual degrees mentioned, not generic terms like "Bachelor's" or "Master's"
- certifications: List of certifications (list of strings)
- summary: Brief professional summary if present (string or empty)

Resume Text:
{resume_text}

Output JSON:
"""

    # Predefined technical skills for regex fallback
    TECHNICAL_SKILLS = {
        "python", "java", "c++", "javascript", "typescript", "html", "css", "sql", "nosql",
        "react", "angular", "vue", "node.js", "django", "flask", "fastapi", "spring boot",
        "docker", "kubernetes", "aws", "azure", "gcp", "ci/cd", "jenkins", "git",
        "machine learning", "deep learning", "nlp", "tensorflow", "pytorch", "scikit-learn",
        "pandas", "numpy", "matplotlib", "seaborn", "tableau", "power bi",
        "linux", "bash", "shell scripting", "agile", "scrum", "jira",
        "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
        "graphql", "rest api", "soap", "microservices", "serverless",
        "terraform", "ansible", "prometheus", "grafana"
    }
    
    def __init__(self):
        self.llm = get_llm()
    
    def extract_resume_data(self, resume_text: str) -> Dict[str, Any]:
        """
        Extract structured data from resume text.
        Uses LLM as primary method, falls back to regex if LLM fails.
        """
        if self.llm and is_llm_available():
            try:
                return self._extract_with_llm(resume_text)
            except Exception as e:
                logger.warning(f"LLM extraction failed, using fallback: {e}")
        
        return self._extract_with_regex(resume_text)
    
    def _extract_with_llm(self, resume_text: str) -> Dict[str, Any]:
        """Extract resume data using LLM."""
        prompt = self.RESUME_EXTRACTION_PROMPT.format(resume_text=resume_text[:4000])
        
        try:
            response = self.llm.invoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Clean response - remove markdown formatting if present
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            # Parse JSON
            data = json.loads(response_text)
            
            # Normalize the data
            return self._normalize_extracted_data(data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            raise
        except Exception as e:
            logger.error(f"LLM extraction error: {e}")
            raise
    
    def _normalize_extracted_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and validate extracted data."""
        experience_years = float(data.get("experience_years", 0) or 0)
        experience_months = int(data.get("experience_months", 0) or 0)
        
        # Calculate months from years if not provided
        if not experience_months and experience_years > 0:
            experience_months = int(experience_years * 12)
        
        # Normalize projects - ensure each project has title and url
        raw_projects = data.get("projects", []) or []
        projects = []
        for proj in raw_projects:
            if isinstance(proj, dict):
                projects.append({
                    "title": proj.get("title", "") or "",
                    "url": proj.get("url", "") or proj.get("link", "") or ""
                })
            elif isinstance(proj, str) and proj.strip():
                projects.append({"title": proj.strip(), "url": ""})
        
        # Clean name - remove address, symbols, etc.
        raw_name = data.get("name", "Unknown") or "Unknown"
        clean_name = self._clean_name(raw_name)
        
        return {
            "name": clean_name,
            "email": data.get("email", "") or "",
            "phone": data.get("phone", "") or "",
            "linkedin_url": data.get("linkedin_url", "") or data.get("linkedin", "") or "",
            "github_url": data.get("github_url", "") or data.get("github", "") or "",
            "skills": data.get("skills", []) or [],
            "experience_years": experience_years,
            "experience_months": experience_months,
            "education": data.get("education", []) or [],
            "certifications": data.get("certifications", []) or [],
            "summary": data.get("summary", "") or ""
        }
    
    def _clean_name(self, name: str) -> str:
        """Clean extracted name - remove address, symbols, etc."""
        if not name or name == "Unknown":
            return "Unknown"
        
        # Stop at common separators
        separators = ['+', '#', '|', '@', '(', ')', ',', ':', ';']
        for sep in separators:
            if sep in name:
                name = name.split(sep)[0]
        
        # Remove numbers (likely address or phone)
        name = re.sub(r'\d+', '', name)
        
        # Remove extra whitespace and clean
        name = re.sub(r'\s+', ' ', name).strip()
        
        # Remove common non-name words
        non_name_words = ['l-', 'apt', 'street', 'road', 'nagar', 'vadodara', 'india', 'address']
        name_lower = name.lower()
        for word in non_name_words:
            if word in name_lower:
                idx = name_lower.find(word)
                name = name[:idx].strip()
                name_lower = name.lower()
        
        # Ensure it looks like a name (mostly letters)
        if name:
            letter_count = sum(1 for c in name if c.isalpha() or c.isspace())
            if len(name) > 0 and letter_count / len(name) < 0.8:
                return "Unknown"
        
        # Title case and limit to reasonable length
        name = name.strip().title()
        words = name.split()
        if len(words) > 5:
            name = ' '.join(words[:5])
        
        return name if len(name) >= 2 else "Unknown"
    
    def _extract_with_regex(self, resume_text: str) -> Dict[str, Any]:
        """Fallback regex-based extraction."""
        logger.info("Using regex fallback for resume extraction")
        
        text = resume_text.lower()
        original_text = resume_text
        
        # 1. Email extraction - improved pattern
        email_patterns = [
            r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            r'[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        ]
        email = ""
        for pattern in email_patterns:
            emails = re.findall(pattern, original_text)
            if emails:
                email = emails[0].replace(' ', '')
                break
        
        # 2. Phone extraction
        phone_patterns = [
            r'\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
            r'\(\d{3}\)\s\d{3}-\d{4}',
            r'\d{3}-\d{3}-\d{4}',
            r'\d{10}'
        ]
        phone = ""
        for pattern in phone_patterns:
            phone_match = re.search(pattern, original_text)
            if phone_match:
                phone = phone_match.group()
                break
        
        # 3. LinkedIn/GitHub URLs
        linkedin_match = re.search(r'linkedin\.com/in/[^\s]+', text)
        linkedin_url = linkedin_match.group() if linkedin_match else ""
        if linkedin_url and not linkedin_url.startswith("http"):
            linkedin_url = "https://" + linkedin_url
        
        github_match = re.search(r'github\.com/[^\s]+', text)
        github_url = github_match.group() if github_match else ""
        if github_url and not github_url.startswith("http"):
            github_url = "https://" + github_url
        
        # 4. Name extraction (from beginning of resume before special chars)
        name = "Unknown"
        name_text = original_text
        
        # Common separators that come after name
        separators = [r'\s*\+\s*', r'\s*#\s*', r'\s*\|\s*', r'\s*@\s*', r'linkedin', r'github', r'\d{10}', r'\+\d{1,3}[-\s]?\d']
        
        for sep in separators:
            match = re.search(sep, name_text, re.IGNORECASE)
            if match:
                name_text = name_text[:match.start()].strip()
                break
        
        name_text = name_text.strip()
        if name_text:
            words = name_text.split()
            if 1 <= len(words) <= 5:
                name_candidate = ' '.join(words[:5])
                name_candidate = re.sub(r'[^\w\s]', '', name_candidate).strip()
                if name_candidate and len(name_candidate) >= 3:
                    letter_count = sum(1 for c in name_candidate if c.isalpha() or c.isspace())
                    if letter_count / len(name_candidate) > 0.8:
                        name = name_candidate.title()
        
        # Fallback: try first non-empty line
        if name == "Unknown":
            lines = [l.strip() for l in original_text.split('\n') if l.strip()]
            if lines:
                first_line = lines[0]
                if (3 <= len(first_line) <= 50 and 
                    not any(char.isdigit() for char in first_line[:20]) and
                    '@' not in first_line and 'http' not in first_line.lower()):
                    name = first_line.title()
        
        # 5. Experience years extraction
        years_patterns = [
            r'(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)',
            r'(?:experience|exp)[:\s]+(\d+)\+?\s*(?:years?|yrs?)',
            r'total\s+(?:experience|exp)[:\s]+(\d+)',
        ]
        experience_years = 0.0
        experience_months = 0
        
        for pattern in years_patterns:
            matches = re.findall(pattern, text)
            if matches:
                experience_years = float(max([int(m) for m in matches]))
                experience_months = int(experience_years * 12)
                break
        
        # If no explicit years, calculate from date ranges
        if experience_years == 0:
            from datetime import datetime
            
            date_range_patterns = [
                r'([a-z]{3,9})\s*[\'"]?(\d{4})\s*[–\-–—to]+\s*([a-z]{3,9}|present|current|now)\s*[\'"]?(\d{4})?',
            ]
            
            months_map = {
                'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
                'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
                'aug': 8, 'august': 8, 'sep': 9, 'sept': 9, 'september': 9,
                'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
            }
            
            current_dt = datetime.now()
            total_months = 0
            
            for pattern in date_range_patterns:
                date_matches = re.findall(pattern, text, re.IGNORECASE)
                for match in date_matches:
                    try:
                        start_month_str = match[0].lower()[:3]
                        start_year = int(match[1])
                        end_month_str = match[2].lower()[:3] if match[2] else ''
                        end_year = int(match[3]) if match[3] and match[3].isdigit() else None
                        
                        start_month = months_map.get(start_month_str, 1)
                        
                        if end_month_str in ['pre', 'cur', 'now'] or not end_month_str:
                            end_year = current_dt.year
                            end_month = current_dt.month
                        else:
                            end_month = months_map.get(end_month_str, 12)
                            if not end_year:
                                end_year = start_year
                        
                        if start_year and end_year:
                            calc_months = (end_year - start_year) * 12 + (end_month - start_month)
                            if 0 < calc_months < 240:
                                total_months += calc_months
                    except (ValueError, TypeError, IndexError):
                        continue
            
            if total_months > 0:
                experience_months = total_months
                experience_years = round(total_months / 12, 2)
        
        # 6. Skills extraction
        found_skills = []
        for skill in self.TECHNICAL_SKILLS:
            if re.search(r'\b' + re.escape(skill) + r'\b', text, re.IGNORECASE):
                found_skills.append(skill.title())
        
        # 7. Education extraction - extract actual degree names
        education_patterns = [
            (r'\b(master\s+of\s+computer\s+application|mca)\b', 'MCA'),
            (r'\b(bachelor\s+of\s+computer\s+application|bca)\b', 'BCA'),
            (r'\b(m\.?tech|master\s+of\s+technology)\b', 'M.Tech'),
            (r'\b(b\.?tech|bachelor\s+of\s+technology)\b', 'B.Tech'),
            (r'\b(m\.?sc|master\s+of\s+science)\b', 'M.Sc'),
            (r'\b(b\.?sc|bachelor\s+of\s+science)\b', 'B.Sc'),
            (r'\b(mba|master\s+of\s+business\s+administration)\b', 'MBA'),
            (r'\b(b\.?e\.?|bachelor\s+of\s+engineering)\b', 'B.E.'),
            (r'\b(ph\.?d\.?|doctorate)\b', 'Ph.D.'),
            (r'\bhsc\b', 'HSC'),
            (r'\bssc\b', 'SSC'),
            (r'\b(diploma)\b', 'Diploma'),
        ]
        
        found_education = []
        for pattern, degree_name in education_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                if degree_name not in found_education:
                    found_education.append(degree_name)
        
        return {
            "name": self._clean_name(name),
            "email": email,
            "phone": phone,
            "linkedin_url": linkedin_url,
            "github_url": github_url,
            "skills": list(set(found_skills)),
            "experience_years": experience_years,
            "experience_months": experience_months,
            "education": found_education,
            "certifications": [],
            "summary": ""
        }


class LLMJDExtractor:
    """
    LLM-based Job Description extraction with regex fallback.
    """
    
    JD_EXTRACTION_PROMPT = """
You are an expert ATS (Applicant Tracking System) parser.
Extract structured data from the following Job Description (JD).

Return ONLY a valid JSON object. Do not add any markdown formatting (like ```json).

Fields to extract:
- required_skills: List of technical and soft skills explicitly required (list of strings)
- preferred_skills: List of nice-to-have skills (list of strings)
- required_experience_years: Number of years required as integer (default to 0 if not mentioned)
- education_required: Minimum education level (e.g., "Bachelor's", "Master's", "PhD", "Any")
- keywords: Important keywords for search optimization (list of strings)

Job Description:
{jd_text}

Output JSON:
"""
    
    TECHNICAL_SKILLS = LLMResumeExtractor.TECHNICAL_SKILLS
    
    def __init__(self):
        self.llm = get_llm()
    
    def extract_jd_data(self, jd_text: str) -> Dict[str, Any]:
        """Extract structured data from job description."""
        if self.llm and is_llm_available():
            try:
                return self._extract_with_llm(jd_text)
            except Exception as e:
                logger.warning(f"LLM JD extraction failed, using fallback: {e}")
        
        return self._extract_with_regex(jd_text)
    
    def _extract_with_llm(self, jd_text: str) -> Dict[str, Any]:
        """Extract JD data using LLM."""
        prompt = self.JD_EXTRACTION_PROMPT.format(jd_text=jd_text[:4000])
        
        try:
            response = self.llm.invoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Clean response
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            data = json.loads(response_text)
            
            return {
                "required_skills": data.get("required_skills", []) or [],
                "preferred_skills": data.get("preferred_skills", []) or [],
                "required_experience_years": int(data.get("required_experience_years", 0) or 0),
                "education_required": data.get("education_required", "Any") or "Any",
                "keywords": data.get("keywords", []) or []
            }
        except Exception as e:
            logger.error(f"LLM JD extraction error: {e}")
            raise
    
    def _extract_with_regex(self, jd_text: str) -> Dict[str, Any]:
        """Fallback regex-based extraction for JD."""
        logger.info("Using regex fallback for JD extraction")
        
        text = jd_text.lower()
        
        # Experience years
        experience_pattern = r'(\d+)(?:\+?|\s*-\s*\d+)?\s*(?:year|yrs)'
        matches = re.findall(experience_pattern, text, re.IGNORECASE)
        years = max([int(m) for m in matches]) if matches else 0
        
        # Education
        education = "Any"
        if "phd" in text or "doctorate" in text:
            education = "PhD"
        elif "master" in text or "m.sc" in text or "mba" in text:
            education = "Master's"
        elif "bachelor" in text or "b.sc" in text or "b.tech" in text or "degree" in text:
            education = "Bachelor's"
        
        # Skills
        found_skills = []
        for skill in self.TECHNICAL_SKILLS:
            if re.search(r'\b' + re.escape(skill) + r'\b', text, re.IGNORECASE):
                found_skills.append(skill)
        
        return {
            "required_skills": found_skills,
            "preferred_skills": [],
            "required_experience_years": years,
            "education_required": education,
            "keywords": found_skills[:10]
        }
