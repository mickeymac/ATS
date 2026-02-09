import io
import pdfplumber
import docx
from fastapi import UploadFile

async def extract_text_from_file(file: UploadFile) -> str:
    content = await file.read()
    filename = (file.filename or "").lower()
    file_ext = filename.split(".")[-1] if "." in filename else ""
    content_type = (file.content_type or "").lower()

    if file_ext == "pdf" or "pdf" in content_type:
        try:
            text = ""
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text += page_text
            return text
        except Exception:
            return ""

    if file_ext == "docx" or "wordprocessingml" in content_type or "docx" in content_type:
        try:
            doc = docx.Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            raise ValueError("Invalid DOCX file. If your file is .doc, please convert to .docx.")

    raise ValueError("Unsupported file format. Please upload a PDF or DOCX file.")
