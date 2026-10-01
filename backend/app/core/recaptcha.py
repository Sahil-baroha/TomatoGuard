import httpx
from fastapi import HTTPException
import os

RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


async def verify_captcha(token: str) -> None:
    """
    Verify a reCAPTCHA v2 token with Google.
    Raises HTTP 400 if the token is invalid or verification fails.
    If RECAPTCHA_SECRET_KEY is not set, the check is skipped (local dev without keys).
    """
    secret = os.getenv("RECAPTCHA_SECRET_KEY", "")
    if not secret:
        return

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                RECAPTCHA_VERIFY_URL,
                data={"secret": secret, "response": token},
            )
        result = resp.json()
    except Exception:
        raise HTTPException(status_code=400, detail="CAPTCHA verification could not be completed. Please try again.")

    if not result.get("success"):
        raise HTTPException(status_code=400, detail="CAPTCHA verification failed. Please complete the CAPTCHA and try again.")
