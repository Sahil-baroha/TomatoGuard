"""
Rule-based soil condition classifier and recommendation engine.

Used by:
  - POST /soil/report/confirm  (input: confirmed numeric fields from OCR)
  - POST /soil/questionnaire   (input: qualitative questionnaire answers)

No ML model is used here — the spec says "rule-based equivalent" since no
confirmed soil ML model exists yet. When a trained model is provided, replace
classify_from_values() with model inference, keeping the same function
signature so the router doesn't need to change.
"""

from typing import Optional


def classify_from_values(
    ph: Optional[float],
    nitrogen: Optional[float],
    phosphorus: Optional[float],
    potassium: Optional[float],
    moisture: Optional[float],
    organic_matter: Optional[float],
) -> dict:
    """
    Rule-based soil condition assessment from numeric lab values.

    Returns:
        {
            "predicted_soil_condition": str,
            "fertilizer_recommendation": str,
            "irrigation_recommendation": str,
        }

    All inputs are optional; the function degrades gracefully when values
    are missing rather than fabricating a result.
    """
    issues = []
    fertilizer_parts = []
    irrigation_parts = []

    # ── pH assessment ────────────────────────────────────────────────────────
    condition = "Unknown"
    if ph is not None:
        if ph < 5.5:
            issues.append("highly acidic")
            fertilizer_parts.append("Apply agricultural lime to raise pH above 6.0.")
        elif ph < 6.0:
            issues.append("acidic")
            fertilizer_parts.append("Consider lime application to bring pH to 6.0–7.0 for optimal tomato growth.")
        elif ph <= 7.5:
            pass  # optimal
        else:
            issues.append("alkaline")
            fertilizer_parts.append("Apply sulphur or acidifying fertilisers to lower pH towards 6.5.")

    # ── Nitrogen ─────────────────────────────────────────────────────────────
    if nitrogen is not None:
        if nitrogen < 0.5:  # low (kg/ha or %)
            issues.append("nitrogen-deficient")
            fertilizer_parts.append("Apply 120–150 kg/ha urea or equivalent nitrogen source in split doses.")
        elif nitrogen > 2.0:
            issues.append("nitrogen-excess")
            fertilizer_parts.append("Reduce nitrogen inputs — excess nitrogen promotes foliage over fruit.")

    # ── Phosphorus ───────────────────────────────────────────────────────────
    if phosphorus is not None:
        if phosphorus < 10:
            issues.append("phosphorus-deficient")
            fertilizer_parts.append("Apply DAP or SSP at 60–80 kg P₂O₅/ha before transplanting.")

    # ── Potassium ────────────────────────────────────────────────────────────
    if potassium is not None:
        if potassium < 100:
            issues.append("potassium-deficient")
            fertilizer_parts.append("Apply 100–120 kg K₂O/ha as muriate or sulphate of potash.")

    # ── Moisture ─────────────────────────────────────────────────────────────
    if moisture is not None:
        if moisture < 20:
            irrigation_parts.append("Soil is dry — irrigate immediately and maintain soil moisture at 40–60%.")
        elif moisture > 70:
            irrigation_parts.append("Excess moisture — reduce irrigation frequency to prevent root rot.")
        else:
            irrigation_parts.append("Moisture is adequate — continue current irrigation schedule.")
    else:
        irrigation_parts.append("Monitor soil moisture regularly; tomatoes need 40–60% field capacity.")

    # ── Organic matter ───────────────────────────────────────────────────────
    if organic_matter is not None and organic_matter < 1.0:
        fertilizer_parts.append("Add farmyard manure (10–15 t/ha) or compost to improve organic matter.")

    # ── Overall condition label ───────────────────────────────────────────────
    if not issues:
        if ph is None and nitrogen is None and phosphorus is None and potassium is None:
            condition = "Insufficient data"
        else:
            condition = "Good"
    elif len(issues) == 1:
        condition = f"Moderate — {issues[0]}"
    else:
        condition = f"Poor — {', '.join(issues)}"

    return {
        "predicted_soil_condition": condition,
        "fertilizer_recommendation": " ".join(fertilizer_parts) if fertilizer_parts else "No specific fertiliser changes required based on available data.",
        "irrigation_recommendation": " ".join(irrigation_parts),
    }


def classify_from_questionnaire(
    crop_stage: Optional[str],
    previous_crop: Optional[str],
    irrigation_type: Optional[str],
    fertilizer_used: Optional[str],
    soil_color: Optional[str],
    drainage_condition: Optional[str],
) -> dict:
    """
    Rule-based soil condition assessment from qualitative questionnaire answers.
    Nutrient fields (ph, nitrogen, etc.) are NOT set — they remain null in the DB
    row as per spec ('nutrient fields null' for questionnaire path).

    Returns the same shape as classify_from_values() for the output fields.
    """
    issues = []
    fertilizer_parts = []
    irrigation_parts = []

    # ── Drainage ─────────────────────────────────────────────────────────────
    if drainage_condition:
        d = drainage_condition.lower()
        if "poor" in d:
            issues.append("poor drainage")
            irrigation_parts.append("Install sub-surface drainage or raise beds to prevent waterlogging.")
        elif "moderate" in d:
            irrigation_parts.append("Monitor soil moisture carefully; moderate drainage may cause waterlogging in heavy rain.")
        else:
            irrigation_parts.append("Good drainage — maintain current field layout.")

    # ── Irrigation type ───────────────────────────────────────────────────────
    if irrigation_type:
        it = irrigation_type.lower()
        if "drip" in it:
            irrigation_parts.append("Drip irrigation is optimal for tomatoes — keep emitters clean and run in 2–3 short cycles per day.")
        elif "furrow" in it:
            irrigation_parts.append("Furrow irrigation: maintain furrow depth and avoid overflows that cause root diseases.")
        elif "sprinkler" in it:
            irrigation_parts.append("Sprinkler irrigation: water early morning to reduce foliar disease risk.")

    # ── Soil color as proxy for organic matter ────────────────────────────────
    if soil_color:
        sc = soil_color.lower()
        if "black" in sc or "dark" in sc:
            fertilizer_parts.append("Dark soil indicates good organic matter — maintain with seasonal compost additions.")
        elif "red" in sc or "laterite" in sc:
            fertilizer_parts.append("Red/laterite soil often lacks micronutrients — consider a micronutrient mix with iron and zinc.")
        elif "sandy" in sc or "light" in sc or "pale" in sc:
            issues.append("low organic matter (sandy/light soil)")
            fertilizer_parts.append("Sandy/light-coloured soil loses nutrients quickly — apply compost (10 t/ha) and use split fertiliser doses.")

    # ── Previous crop ─────────────────────────────────────────────────────────
    if previous_crop:
        pc = previous_crop.lower()
        if "legume" in pc or "pulse" in pc or "bean" in pc or "lentil" in pc:
            fertilizer_parts.append("Legume previous crop leaves residual nitrogen — reduce N application by 20–25%.")
        elif "tomato" in pc or "potato" in pc or "pepper" in pc or "brinjal" in pc:
            fertilizer_parts.append("Same-family previous crop increases disease pressure — ensure thorough crop rotation next season.")

    # ── Crop stage ────────────────────────────────────────────────────────────
    if crop_stage:
        cs = crop_stage.lower()
        if "seedling" in cs or "transplant" in cs:
            fertilizer_parts.append("At transplanting stage, prioritise phosphorus for root establishment.")
        elif "flowering" in cs or "fruit" in cs:
            fertilizer_parts.append("At flowering/fruiting stage, increase potassium to improve fruit size and quality.")
        elif "harvest" in cs:
            fertilizer_parts.append("At harvest stage, reduce irrigation to improve fruit dry matter.")

    # ── Overall condition ─────────────────────────────────────────────────────
    if not issues:
        condition = "Moderate — qualitative assessment only"
    else:
        condition = f"Moderate — {', '.join(issues)}"

    return {
        "predicted_soil_condition": condition,
        "fertilizer_recommendation": " ".join(fertilizer_parts) if fertilizer_parts else "Insufficient questionnaire data for specific fertiliser recommendations.",
        "irrigation_recommendation": " ".join(irrigation_parts) if irrigation_parts else "Monitor soil moisture and adjust irrigation based on crop and weather conditions.",
    }
