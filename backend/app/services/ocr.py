import re
import io
import json

# Fallback values
_TESSERACT_AVAILABLE = False
_GEMINI_AVAILABLE = False

try:
    import pytesseract
    from PIL import Image as PILImage
    _TESSERACT_AVAILABLE = True
    
    # Explicitly point to the default Windows install path
    import os
    if os.path.exists(r"C:\Program Files\Tesseract-OCR\tesseract.exe"):
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
except ImportError:
    pass

try:
    import google.generativeai as genai
    from app.core.config import settings
    # Match your settings config key (e.g. GEMINI_API_KEY or GEMINI_KEY)
    ApiKey = getattr(settings, "GEMINI_API_KEY", getattr(settings, "GEMINI_KEY", None))
    if api_key:
        genai.configure(api_key=api_key)
        _GEMINI_AVAILABLE = True
except ImportError:
    pass

def _extract_number(text: str, pattern: str) -> float | None:
    match = re.search(pattern, text, re.IGNORECASE)
    if not match:
        return None
    val = match.group(1).replace(",", ".")
    try:
        return float(val)
    except ValueError:
        return None

def parse_with_gemini(raw_text: str) -> dict:
    """Uses Gemini API to structure the raw OCR text into the exact fields we need."""
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = f"""
You are a specialized agricultural parsing assistant.
Extract the following soil parameters from the OCR text below. 
Return ONLY a valid JSON object (without markdown code blocks) with the exact keys:
"ph", "nitrogen", "phosphorus", "potassium", "moisture", "organic_matter".
The values must be numbers (float or int). If a value is missing or unreadable, use null.

OCR TEXT:
{raw_text}
"""
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Remove potential markdown formatting if the model still outputs it
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        parsed = json.loads(text.strip())
        return parsed
    except Exception as e:
        print(f"Gemini parsing failed: {e}")
        return {}

def run_ocr(image_bytes: bytes) -> dict:
    """
    Runs server-side OCR on the image to extract soil test parameters.
    1. Uses Tesseract to get raw text.
    2. Uses Gemini to parse the text into structured JSON (if configured).
    3. Falls back to Regex if Gemini is unavailable or fails.
    """
    if not _TESSERACT_AVAILABLE:
        return {
            "raw_ocr_text": "[OCR unavailable: Tesseract binary not found. Install Tesseract OCR and ensure it is on your system PATH.]",
            "ph": None, "nitrogen": None, "phosphorus": None,
            "potassium": None, "moisture": None, "organic_matter": None
        }

    try:
        image = PILImage.open(io.BytesIO(image_bytes))
        raw_text = pytesseract.image_to_string(image)
    except Exception as e:
        return {
            "raw_ocr_text": f"[OCR Error: {str(e)}]",
            "ph": None, "nitrogen": None, "phosphorus": None,
            "potassium": None, "moisture": None, "organic_matter": None
        }

    # 1. Try Gemini Parsing (Robust)
    if _GEMINI_AVAILABLE:
        gemini_parsed = parse_with_gemini(raw_text)
        if gemini_parsed and isinstance(gemini_parsed, dict) and any(k in gemini_parsed for k in ["ph", "nitrogen", "phosphorus"]):
            return {
                "raw_ocr_text": raw_text,
                "ph": gemini_parsed.get("ph"),
                "nitrogen": gemini_parsed.get("nitrogen"),
                "phosphorus": gemini_parsed.get("phosphorus"),
                "potassium": gemini_parsed.get("potassium"),
                "moisture": gemini_parsed.get("moisture"),
                "organic_matter": gemini_parsed.get("organic_matter")
            }

    # 2. Fallback to Regex Parsing (Brittle)
    parsed = {
        "ph":           _extract_number(raw_text, r"pH[^\d\n]*([\d.,]+)"),
        "nitrogen":     _extract_number(raw_text, r"(?:nitrogen|Nitrogen)[^\d\n]*([\d.,]+)"),
        "phosphorus":   _extract_number(raw_text, r"(?:phosphorus|phosphorous|Phosphoric)[^\d\n]*([\d.,]+)"),
        "potassium":    _extract_number(raw_text, r"(?:potassium|Potassium)[^\d\n]*([\d.,]+)"),
        "moisture":     _extract_number(raw_text, r"(?:moisture|Water\s*Saturation)[^\d\n]*([\d.,]+)"),
        "organic_matter": _extract_number(raw_text, r"(?:organic\s*matter|Humus)[^\d\n]*([\d.,]+)"),
    }

    return {"raw_ocr_text": raw_text, **parsed}