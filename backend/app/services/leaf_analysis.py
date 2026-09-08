"""
leaf_analysis.py — OpenCV-based pre-inference guardrail, severity estimation,
and rule-based treatment-tier logic.

Adapted from docs/app_gradio.py (teammate-validated Gradio prototype).
Thresholds and tier boundaries are the prototype's untuned starting values —
they are flagged here for later agronomic review and must not be treated as
expert-verified constants.
"""

from __future__ import annotations
import io
import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Minimum % of green foliage pixels required before running CNN inference.
# Source: app_gradio.py MIN_PLANT_PIXEL_RATIO. UNTUNED — needs agronomic validation.
_MIN_PLANT_PIXEL_RATIO = 8.0


def is_valid_plant_leaf(image_bytes: bytes) -> tuple[bool, float]:
    """
    HSV green-pixel-ratio guardrail. Returns (is_valid, plant_ratio_pct).

    Rejects the image before CNN inference if plant_ratio < _MIN_PLANT_PIXEL_RATIO.
    HSV range [20-90] hue covers yellowing/diseased leaves as well as healthy green.

    NOTE: The 8% threshold is an untuned starting value from the prototype,
    not a validated constant. Re-evaluate against a broader image set.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            return False, 0.0

        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        lower = np.array([20, 30, 30])
        upper = np.array([90, 255, 255])
        mask = cv2.inRange(hsv, lower, upper)

        plant_pixels = cv2.countNonZero(mask)
        total_pixels = img_bgr.shape[0] * img_bgr.shape[1]
        plant_ratio = (plant_pixels / total_pixels) * 100.0

        return plant_ratio >= _MIN_PLANT_PIXEL_RATIO, round(plant_ratio, 2)

    except Exception as exc:
        logger.error("Guardrail check failed: %s", exc)
        return False, 0.0


def calculate_severity(image_bytes: bytes, is_healthy: bool) -> float:
    """
    HSV-based diseased-vs-healthy pixel ratio, 0–100.

    Returns 0.0 immediately if is_healthy=True (skip heavy pixels for a
    healthy prediction to keep severity logically consistent).
    """
    if is_healthy:
        return 0.0

    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            return 0.0

        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

        # Healthy green range
        green_mask = cv2.inRange(hsv, np.array([25, 40, 40]), np.array([85, 255, 255]))
        # Diseased (yellow/brown spots) range
        diseased_mask = cv2.inRange(hsv, np.array([10, 30, 30]), np.array([25, 255, 255]))

        green_px = cv2.countNonZero(green_mask)
        diseased_px = cv2.countNonZero(diseased_mask)
        total_leaf_px = green_px + diseased_px

        if total_leaf_px == 0:
            return 0.0

        severity_pct = (diseased_px / total_leaf_px) * 100.0
        return round(severity_pct, 2) if severity_pct >= 1.0 else 0.0

    except Exception as exc:
        logger.error("Severity calculation failed: %s", exc)
        return 0.0


def get_treatment_tier(display_name: str, severity_pct: float) -> dict:
    """
    Rule-based DSS treatment tier. Returns dict with:
      severity_label: str  — "None" / "Mild" / "Moderate" / "Severe"
      recommendation: str  — action text stored in disease_scans.recommendation

    Tier boundaries are adapted from app_gradio.py run_dss_engine().
    UNTUNED — these 0/5/25% boundaries are prototype values, not
    expert-verified agronomic thresholds. Flag for agronomist review before
    production use.
    """
    if display_name == "Healthy" or severity_pct == 0.0:
        return {
            "severity_label": "None",
            "recommendation": (
                "No chemical application required. "
                "Maintain routine visual inspection once per week."
            ),
        }

    if severity_pct < 5.0:
        return {
            "severity_label": "Mild",
            "recommendation": (
                "Mild infection (<5% leaf area affected). "
                "Apply organic treatment: Neem oil spray (1500 PPM) at 5 ml/litre of water. "
                "Avoid overhead watering; irrigate at the root zone."
            ),
        }

    if severity_pct <= 25.0:
        return {
            "severity_label": "Moderate",
            "recommendation": (
                "Moderate infection (5–25% leaf area affected). "
                "Apply targeted fungicide: Copper Oxychloride @ 2.5 g/litre of water. "
                "Avoid overhead watering; irrigate at the root zone."
            ),
        }

    return {
        "severity_label": "Severe",
        "recommendation": (
            "Severe infection (>25% leaf area affected). "
            "Prune heavily damaged leaves immediately. "
            "Apply systemic fungicide (Mancozeb / Chlorothalonil). "
            "Avoid overhead watering; irrigate at the root zone."
        ),
    }


# ── Knowledge base for description and prevention tips (display_name-keyed) ───
_KNOWLEDGE: dict[str, dict] = {
    "Bacterial Spot": {
        "description": "Caused by Xanthomonas bacteria — dark, water-soaked lesions on leaves, stems, and fruit. Spreads rapidly in warm, wet weather.",
        "prevention_tips": "Use certified disease-free transplants. Practice 2-year crop rotation. Use drip irrigation to keep foliage dry.",
    },
    "Early Blight": {
        "description": "Alternaria solani — dark concentric rings forming a 'target' pattern on older leaves. Thrives in warm, humid conditions.",
        "prevention_tips": "Mulch around plants to prevent soil splash. Avoid overhead irrigation. Select blight-resistant varieties.",
    },
    "Late Blight": {
        "description": "Phytophthora infestans — greasy grey-green patches that rapidly turn brown. Can destroy an entire crop within days in cool, moist conditions.",
        "prevention_tips": "Plant resistant varieties. Avoid planting near potatoes. Apply protectant fungicide before predicted wet, cool spells.",
    },
    "Leaf Mold": {
        "description": "Passalora fulva — pale yellow patches on upper leaf surface with olive-grey mold on the underside. Most common in high-humidity environments.",
        "prevention_tips": "Maintain relative humidity below 85%. Space plants well. Resistant varieties are strongly recommended for greenhouse production.",
    },
    "Septoria Leaf Spot": {
        "description": "Septoria lycopersici — small circular spots with dark borders and light centres on older leaves. Severe infections cause defoliation.",
        "prevention_tips": "Water at the base only. Mulch to reduce soil splash. Practice 2–3 year crop rotation.",
    },
    "Spider Mites (Two-Spotted)": {
        "description": "Tetranychus urticae — tiny arachnids producing stippled, bronzed foliage and fine webbing. Proliferate rapidly in hot, dry conditions.",
        "prevention_tips": "Maintain adequate soil moisture. Encourage natural predators. Avoid excessive nitrogen fertilisation.",
    },
    "Target Spot": {
        "description": "Corynespora cassiicola — circular brown lesions with concentric rings on leaves, stems, and fruit. Favoured by warm, humid conditions.",
        "prevention_tips": "Avoid over-crowding. Use drip irrigation. Rotate crops annually. Remove plant debris promptly.",
    },
    "Yellow Leaf Curl Virus": {
        "description": "TYLCV transmitted by whitefly — upward leaf curling, yellowing, stunted growth, severely reduced fruit set. No chemical cure.",
        "prevention_tips": "Use virus-resistant varieties. Install yellow sticky traps. Use reflective mulches. Maintain a 50-metre buffer from infected fields.",
    },
    "Mosaic Virus": {
        "description": "ToMV — light and dark green mosaic pattern on leaves with distortion and stunted growth. Highly contagious via mechanical contact.",
        "prevention_tips": "Source certified virus-free seed. Use ToMV-resistant varieties. Disinfect tools with 10% bleach solution between uses.",
    },
    "Healthy": {
        "description": "No visible signs of disease, pest damage, or nutrient deficiency. Continue current crop management practices.",
        "prevention_tips": "Maintain consistent watering and fertilisation. Rotate crops each season and scout regularly.",
    },
}


def get_knowledge(display_name: str) -> dict:
    """Return description and prevention_tips for a display name."""
    return _KNOWLEDGE.get(display_name, {
        "description": None,
        "prevention_tips": None,
    })
