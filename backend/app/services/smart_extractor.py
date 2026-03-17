"""
Smart Resume Extraction Service with 3-Tier Fallback System.

Tier 1 (Primary): PyMuPDF/pdfplumber + Groq Llama 3.3-70B (Best Quality)
Tier 2 (Secondary): pdfplumber + Mistral 7B via HuggingFace (Good Quality)
Tier 3 (Fallback): Regex-based extraction (Basic, Always Works)

This module provides the highest accuracy extraction with graceful degradation.
Note: LlamaParse is incompatible with Python 3.14, so we use local PDF extraction + Groq.
"""

import os
import re
import io
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ============================================================================
# DOMAIN DETECTION (from Custom-LLM)
# ============================================================================

DOMAIN_KEYWORDS = {
    "Software Engineering": ["software", "developer", "engineer", "programming", "backend", "frontend", "fullstack", "full-stack", "sde", "swe"],
    "Data Science": ["data scientist", "machine learning", "ml engineer", "ai", "artificial intelligence", "deep learning", "nlp", "data analytics"],
    "DevOps": ["devops", "sre", "site reliability", "infrastructure", "cloud engineer", "platform engineer", "kubernetes", "docker"],
    "Product Management": ["product manager", "product owner", "pm", "product lead"],
    "Design": ["designer", "ux", "ui", "user experience", "user interface", "graphic design", "visual design"],
    "Marketing": ["marketing", "seo", "growth", "brand", "content marketing", "digital marketing"],
    "Sales": ["sales", "account executive", "business development", "bdm", "account manager"],
    "Finance": ["finance", "accountant", "financial analyst", "cfo", "controller", "auditor"],
    "Human Resources": ["hr", "human resources", "recruiter", "talent acquisition", "people operations"],
    "Operations": ["operations", "supply chain", "logistics", "procurement"],
    "Consulting": ["consultant", "advisory", "strategy"],
    "Healthcare": ["healthcare", "medical", "clinical", "nurse", "doctor", "physician", "pharma"],
    "Education": ["teacher", "professor", "instructor", "educator", "academic"],
    "Legal": ["lawyer", "attorney", "legal", "paralegal", "counsel"],
    "RPA": ["rpa", "robotic process automation", "uipath", "automation anywhere", "blue prism", "power automate"],
}

MONTH_MAP = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6,
    "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12
}


def parse_date_to_month_year(date_str: str) -> Tuple[Optional[int], Optional[int]]:
    """Parse a date string and return (month, year) tuple."""
    if not date_str:
        return (None, None)
    
    date_str = date_str.lower().strip()
    
    # Handle "present", "current", "now"
    if re.search(r'\b(present|current|now|ongoing)\b', date_str, re.IGNORECASE):
        now = datetime.now()
        return (now.month, now.year)
    
    # Try to find month name
    month = None
    for m_name, m_num in MONTH_MAP.items():
        if m_name in date_str:
            month = m_num
            break
    
    # Find year (4-digit)
    year_match = re.search(r'\b(19|20)\d{2}\b', date_str)
    year = int(year_match.group(0)) if year_match else None
    
    # Handle 2-digit year with apostrophe ('19, '20)
    if not year:
        two_digit = re.search(r"['\u2019](\d{2})\b", date_str)
        if two_digit:
            y = int(two_digit.group(1))
            year = 2000 + y if y <= 69 else 1900 + y
    
    # Default month to 1 if we have year but no month
    if year and not month:
        month = 1
    
    return (month, year)


def calculate_duration_months(dates_str: str) -> int:
    """Calculate duration in months from a date range string."""
    if not dates_str:
        return 0
    
    # Normalize dashes
    dates_str = re.sub(r'[\u2013\u2014]', '-', dates_str)
    dates_str = re.sub(r'\s+to\s+|\s+until\s+|\s+till\s+', ' - ', dates_str, flags=re.IGNORECASE)
    
    # Split by dash
    parts = re.split(r'\s*-\s*', dates_str)
    
    if len(parts) >= 2:
        start_month, start_year = parse_date_to_month_year(parts[0])
        end_month, end_year = parse_date_to_month_year(parts[1])
    else:
        # Single date - assume it's ongoing or just a year
        start_month, start_year = parse_date_to_month_year(parts[0])
        end_month, end_year = start_month, start_year
    
    if start_year is None or end_year is None:
        return 0
    
    # Calculate months
    start_month = start_month or 1
    end_month = end_month or 12
    
    total_months = (end_year - start_year) * 12 + (end_month - start_month) + 1
    return max(0, total_months)


def detect_domain(title: str, bullets: List[str]) -> str:
    """Detect the domain/industry based on job title and responsibilities."""
    text = f"{title} {' '.join(bullets)}".lower()
    
    for domain, keywords in DOMAIN_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in text:
                return domain
    
    return "General"


def calculate_domain_experience(experiences: List[Dict]) -> List[Dict]:
    """Calculate experience by domain."""
    domain_months = {}
    domain_roles = {}
    
    for exp in experiences:
        domain = exp.get("domain", "General")
        months = exp.get("duration_months", 0)
        title = exp.get("title", "")
        
        if domain not in domain_months:
            domain_months[domain] = 0
            domain_roles[domain] = []
        
        domain_months[domain] += months
        if title and title not in domain_roles[domain]:
            domain_roles[domain].append(title)
    
    result = []
    for domain, months in sorted(domain_months.items(), key=lambda x: -x[1]):
        if months > 0:
            result.append({
                "domain": domain,
                "years": round(months / 12, 1),
                "roles": domain_roles[domain]
            })
    
    return result


# ============================================================================
# TIER 1: PDF TEXT EXTRACTION + GROQ (Primary - Best Quality)
# ============================================================================

class Tier1Extractor:
    """
    Primary extraction using PyMuPDF/pdfplumber + Groq Llama 3.3-70B.
    Highest accuracy, requires Groq API key.
    
    Note: We use local PDF extraction instead of LlamaParse because 
    LlamaParse's Pydantic v1 is incompatible with Python 3.14.
    """
    
    def __init__(self):
        self.groq_key = os.getenv("GROQ_API_KEY", "")
        self._groq_client = None
    
    def is_available(self) -> bool:
        """Check if Tier 1 extraction is available."""
        return bool(self.groq_key)
    
    def _get_groq_client(self):
        """Lazy-load Groq client."""
        if self._groq_client is None:
            try:
                from groq import Groq
                self._groq_client = Groq(api_key=self.groq_key)
            except ImportError:
                logger.warning("Groq not installed. Install with: pip install groq")
                return None
            except Exception as e:
                logger.error(f"Failed to initialize Groq: {e}")
                return None
        return self._groq_client
    
    def _extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF using pymupdf (preferred), pdfplumber, or EasyOCR for image PDFs."""
        text = ""
        
        # Try pymupdf first (fastest for text-based PDFs)
        try:
            import fitz  # pymupdf
            doc = fitz.open(stream=file_content, filetype="pdf")
            for page in doc:
                text += page.get_text() + "\n"
            doc.close()
            if text.strip() and len(text.strip()) > 100:
                logger.info(f"Tier1: Extracted {len(text)} chars using pymupdf")
                return text
        except ImportError:
            pass
        except Exception as e:
            logger.warning(f"pymupdf failed: {e}")
        
        # Fallback to pdfplumber
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text += page_text + "\n"
            if text.strip() and len(text.strip()) > 100:
                logger.info(f"Tier1: Extracted {len(text)} chars using pdfplumber")
                return text
        except Exception as e:
            logger.warning(f"pdfplumber failed: {e}")
        
        # For image-based PDFs, use EasyOCR
        logger.info("Tier1: PDF appears to be image-based, trying EasyOCR...")
        try:
            import easyocr
            import fitz
            import numpy as np
            from PIL import Image
            
            # Initialize EasyOCR reader (lazy load)
            reader = easyocr.Reader(['en'], gpu=False)
            
            doc = fitz.open(stream=file_content, filetype="pdf")
            text = ""
            
            for page_num, page in enumerate(doc):
                logger.info(f"Tier1: OCR processing page {page_num + 1}/{len(doc)}...")
                
                # Convert page to image (high res for better OCR)
                mat = fitz.Matrix(2, 2)  # 2x zoom
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.tobytes("ppm")
                img = Image.open(io.BytesIO(img_data))
                img_array = np.array(img)
                
                # Run OCR
                results = reader.readtext(img_array, detail=0, paragraph=True)
                page_text = "\n".join(results)
                text += page_text + "\n\n"
            
            doc.close()
            logger.info(f"Tier1: EasyOCR extracted {len(text)} chars")
            return text
            
        except ImportError as e:
            logger.warning(f"EasyOCR not available: {e}")
        except Exception as e:
            logger.warning(f"EasyOCR failed: {e}")
        
        return text
    
    def _extract_json_with_groq(self, resume_text: str) -> Dict:
        """Extract structured JSON from resume text using Groq."""
        client = self._get_groq_client()
        if not client:
            raise ValueError("Groq client not available")
        
        prompt = f"""
You are an expert Resume Parser. Convert the following Resume content into a structured JSON object.
IMPORTANT: Return ONLY a valid JSON object. Do not include any introductory text, explanations, or markdown formatting tags.

REQUIRED JSON SCHEMA:
{{
    "personal_info": {{
        "name": "Full Name",
        "email": "Email Address",
        "phone": "Phone Number",
        "links": ["LinkedIn URL", "GitHub URL", "Portfolio URL"]
    }},
    "skills": ["Skill 1", "Skill 2", "..."],
    "experience": [
        {{
            "company": "Company Name",
            "title": "Job Title",
            "dates": "Employment Period (e.g., 'Jan 2020 - Present')",
            "bullets": ["Achievement 1", "Achievement 2"]
        }}
    ],
    "education": [
        {{
            "institution": "University Name",
            "degree": "Degree Name",
            "year": "Graduation Year"
        }}
    ],
    "awards": ["Award 1", "Certification 1", "..."]
}}

RESUME CONTENT:
{resume_text}
"""
        
        logger.info("Tier1: Extracting JSON via Groq Llama 3.3-70B...")
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a specialized resume parser that always returns valid JSON."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            stream=False,
            response_format={"type": "json_object"}
        )
        
        raw_content = chat_completion.choices[0].message.content
        return json.loads(raw_content)
    
    async def extract(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Extract resume data using local PDF extraction + Groq.
        Returns structured data with domain analysis.
        """
        if not self.is_available():
            raise ValueError("Tier 1 extraction not available - missing GROQ_API_KEY")
        
        # Step 1: Extract text from PDF
        resume_text = self._extract_text_from_pdf(file_content)
        
        if not resume_text or len(resume_text.strip()) < 100:
            raise ValueError(f"Could not extract sufficient text from PDF (got {len(resume_text)} chars)")
        
        # Step 2: Extract structured JSON using Groq
        structured_data = self._extract_json_with_groq(resume_text)
        
        # Step 3: Enrich experience data
        total_months = 0
        enriched_experiences = []
        
        for exp in structured_data.get("experience", []):
            dates = exp.get("dates", "")
            title = exp.get("title", "")
            bullets = exp.get("bullets", [])
            
            duration_months = calculate_duration_months(dates)
            total_months += duration_months
            domain = detect_domain(title, bullets)
            
            enriched_exp = {
                **exp,
                "duration_months": duration_months,
                "domain": domain
            }
            enriched_experiences.append(enriched_exp)
        
        # Step 4: Calculate totals
        domain_exp = calculate_domain_experience(enriched_experiences)
        
        # Normalize output to match HR ATS expected format
        personal_info = structured_data.get("personal_info", {})
        links = personal_info.get("links", [])
        
        # Extract LinkedIn and GitHub from links
        linkedin_url = ""
        github_url = ""
        for link in links:
            link_lower = link.lower()
            if "linkedin" in link_lower:
                linkedin_url = link
            elif "github" in link_lower:
                github_url = link
        
        # Build normalized result
        result = {
            "name": personal_info.get("name", "Unknown"),
            "email": personal_info.get("email", ""),
            "phone": personal_info.get("phone", ""),
            "linkedin_url": linkedin_url,
            "github_url": github_url,
            "skills": structured_data.get("skills", []),
            "experience_years": round(total_months / 12, 1) if total_months > 0 else 0,
            "experience_months": total_months,
            "education": [edu.get("degree", "") for edu in structured_data.get("education", [])],
            "certifications": structured_data.get("awards", []),
            "summary": "",
            
            # Rich experience data
            "experience_details": enriched_experiences,
            "domain_experience": domain_exp,
            "awards": structured_data.get("awards", []),
            "education_details": structured_data.get("education", []),
            
            # Also store raw text for scoring
            "extracted_text": resume_text,
            
            # Extraction metadata
            "extraction_method": "groq_llama3",
            "extraction_tier": 1
        }
        
        logger.info(f"Tier1: Successfully extracted - {result['name']}, {len(result['skills'])} skills, {result['experience_years']} years")
        return result


# ============================================================================
# TIER 2: PDFPLUMBER + MISTRAL 7B (Secondary - Good Quality)
# ============================================================================

class Tier2Extractor:
    """
    Secondary extraction using pdfplumber + Mistral 7B via HuggingFace.
    Good accuracy, uses existing HR ATS infrastructure.
    """
    
    def __init__(self):
        self._extractor = None
        self._is_llm_available = None
    
    def _lazy_init(self):
        if self._extractor is None:
            from app.services.llm_extractor import LLMResumeExtractor, is_llm_available
            self._extractor = LLMResumeExtractor()
            self._is_llm_available = is_llm_available
    
    def is_available(self) -> bool:
        """Check if Tier 2 extraction is available."""
        self._lazy_init()
        return self._is_llm_available()
    
    def extract(self, resume_text: str) -> Dict[str, Any]:
        """
        Extract resume data using Mistral 7B.
        """
        self._lazy_init()
        if not self._is_llm_available():
            raise ValueError("Tier 2 extraction not available - HuggingFace API not configured")
        
        logger.info("Tier2: Extracting via Mistral 7B...")
        result = self._extractor.extract_resume_data(resume_text)
  
        
        # Add extraction metadata
        result["extraction_method"] = "mistral_7b"
        result["extraction_tier"] = 2
        result["extracted_text"] = resume_text
        
        # Add empty placeholders for new fields (not available in Tier 2)
        result.setdefault("experience_details", [])
        result.setdefault("domain_experience", [])
        result.setdefault("awards", [])
        result.setdefault("education_details", [])
        
        logger.info(f"Tier2: Successfully extracted - {result.get('name', 'Unknown')}")
        return result


# ============================================================================
# TIER 3: REGEX FALLBACK (Always Works)
# ============================================================================

class Tier3Extractor:
    """
    Fallback regex-based extraction.
    Basic accuracy, but always works without external dependencies.
    """
    
    def __init__(self):
        self._extractor = None
    
    def _lazy_init(self):
        if self._extractor is None:
            from app.services.llm_extractor import LLMResumeExtractor
            self._extractor = LLMResumeExtractor()
    
    def is_available(self) -> bool:
        """Regex is always available."""
        return True
    
    def extract(self, resume_text: str) -> Dict[str, Any]:
        """
        Extract resume data using regex patterns.
        """
        self._lazy_init()
        logger.info("Tier3: Extracting via regex fallback...")
        result = self._extractor._extract_with_regex(resume_text)
        
        # Add extraction metadata
        result["extraction_method"] = "regex"
        result["extraction_tier"] = 3
        result["extracted_text"] = resume_text
        
        # Add empty placeholders for new fields
        result.setdefault("experience_details", [])
        result.setdefault("domain_experience", [])
        result.setdefault("awards", [])
        result.setdefault("education_details", [])
        
        logger.info(f"Tier3: Successfully extracted - {result.get('name', 'Unknown')}")
        return result


# ============================================================================
# SMART EXTRACTOR (Main Entry Point)
# ============================================================================

class SmartExtractor:
    """
    Smart Resume Extractor with 3-tier fallback system.
    
    Usage:
        extractor = SmartExtractor()
        result = await extractor.extract(file_content, filename, resume_text)
    """
    
    def __init__(self):
        self.tier1 = Tier1Extractor()
        self.tier2 = Tier2Extractor()
        self.tier3 = Tier3Extractor()
    
    async def extract(
        self, 
        file_content: bytes, 
        filename: str,
        resume_text: str = ""
    ) -> Dict[str, Any]:
        """
        Extract resume data using the best available method.
        
        Args:
            file_content: Raw bytes of the PDF/DOCX file
            filename: Original filename (used for format detection)
            resume_text: Pre-extracted text (used for Tier 2/3 if Tier 1 fails)
        
        Returns:
            Extracted resume data with extraction_method and extraction_tier fields
        """
        
        errors = []
        
        # Tier 1: Groq Llama 3.3-70B (Primary)
        if self.tier1.is_available() and filename.lower().endswith(('.pdf', '.docx','.txt','.png','.jpg','.jpeg','.gif','.webp')):
            try:
                logger.info("SmartExtractor: Attempting Tier 1 (PyMuPDF + Groq)...")
                result = await self.tier1.extract(file_content, filename)
                logger.info("SmartExtractor: Tier 1 successful!")
                return result
            except Exception as e:
                error_msg = f"Tier 1 failed: {str(e)}"
                logger.warning(error_msg)
                errors.append(error_msg)
        elif not filename.lower().endswith('.pdf'):
            logger.info("SmartExtractor: Tier 1 skipped (not a PDF file)")
        else:
            logger.info("SmartExtractor: Tier 1 not available (missing GROQ_API_KEY)")
        
        # Tier 2: Mistral 7B (Secondary)
        if self.tier2.is_available() and resume_text:
            try:
                logger.info("SmartExtractor: Attempting Tier 2 (Mistral 7B)...")
                result = self.tier2.extract(resume_text)
                logger.info("SmartExtractor: Tier 2 successful!")
                return result
            except Exception as e:
                error_msg = f"Tier 2 failed: {str(e)}"
                logger.warning(error_msg)
                errors.append(error_msg)
        elif not resume_text:
            logger.info("SmartExtractor: Tier 2 skipped (no text available)")
        else:
            logger.info("SmartExtractor: Tier 2 not available (HuggingFace not configured)")
        
        # Tier 3: Regex Fallback (Always works)
        if resume_text:
            try:
                logger.info("SmartExtractor: Attempting Tier 3 (Regex)...")
                result = self.tier3.extract(resume_text)
                logger.info("SmartExtractor: Tier 3 successful!")
                return result
            except Exception as e:
                error_msg = f"Tier 3 failed: {str(e)}"
                logger.warning(error_msg)
                errors.append(error_msg)
        
        # All tiers failed - return minimal data
        logger.error(f"SmartExtractor: All tiers failed. Errors: {errors}")
        return {
            "name": "Unknown",
            "email": "",
            "phone": "",
            "linkedin_url": "",
            "github_url": "",
            "skills": [],
            "experience_years": 0,
            "experience_months": 0,
            "education": [],
            "certifications": [],
            "summary": "",
            "experience_details": [],
            "domain_experience": [],
            "awards": [],
            "education_details": [],
            "extracted_text": resume_text or "",
            "extraction_method": "failed",
            "extraction_tier": 0,
            "extraction_errors": errors
        }


# ============================================================================
# CONVENIENCE FUNCTION
# ============================================================================

# Global singleton instance
_smart_extractor = None

def get_smart_extractor() -> SmartExtractor:
    """Get or create the global SmartExtractor instance."""
    global _smart_extractor
    if _smart_extractor is None:
        _smart_extractor = SmartExtractor()
    return _smart_extractor


async def smart_extract_candidate_info(
    file_content: bytes,
    filename: str, 
    resume_text: str = ""
) -> Dict[str, Any]:
    """
    Convenience function for smart extraction.
    
    Args:
        file_content: Raw bytes of the uploaded file
        filename: Original filename
        resume_text: Pre-extracted text (optional, used for Tier 2/3)
    
    Returns:
        Extracted candidate data
    """
    extractor = get_smart_extractor()
    return await extractor.extract(file_content, filename, resume_text)
