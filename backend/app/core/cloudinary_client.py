"""
Cloudinary upload helper.

Used by POST /disease/analyze (and POST /soil/report in Phase 4).
Reads CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET from the
environment — never hardcoded. The frontend never calls Cloudinary directly.
"""
import cloudinary
import cloudinary.uploader
from app.core.config import settings


def _configure():
    """Configure the Cloudinary SDK once using env vars."""
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_image(file_bytes: bytes, folder: str) -> dict:
    """
    Upload raw image bytes to Cloudinary.

    Args:
        file_bytes: Raw image data.
        folder:     Cloudinary folder name (e.g. 'disease_scans').

    Returns:
        {
            "secure_url":  str  — HTTPS URL to the uploaded image,
            "public_id":   str  — Cloudinary public_id for later deletion/transforms.
        }

    Raises:
        RuntimeError if the upload fails.
    """
    _configure()
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        resource_type="image",
    )
    return {
        "secure_url": result["secure_url"],
        "public_id": result["public_id"],
    }
