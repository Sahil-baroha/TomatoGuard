"""
WMO weather code → human-readable condition string.
Source: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
"""
import httpx
from typing import Optional

WMO_CODES: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}

BASE = "https://api.open-meteo.com/v1/forecast"

CURRENT_VARS = (
    "temperature_2m,relative_humidity_2m,precipitation,"
    "wind_speed_10m,surface_pressure,weather_code"
)

DAILY_VARS = (
    "weather_code,temperature_2m_max,temperature_2m_min,"
    "precipitation_sum,wind_speed_10m_max"
)


def code_to_condition(code: Optional[int]) -> str:
    if code is None:
        return "Unknown"
    return WMO_CODES.get(int(code), f"Weather code {code}")


def get_current(lat: float, lon: float) -> dict:
    """
    Calls Open-Meteo /v1/forecast for current conditions.
    Returns a dict matching the weather_records schema columns:
      temperature_c, humidity_percent, rainfall_mm,
      wind_speed_kmh, pressure_hpa, weather_condition
    Open-Meteo default units already match schema — no conversion needed.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": CURRENT_VARS,
        "timezone": "auto",
    }
    with httpx.Client(timeout=10) as client:
        resp = client.get(BASE, params=params)
        resp.raise_for_status()
    data = resp.json()
    cur = data.get("current", {})
    return {
        "temperature_c":    cur.get("temperature_2m"),
        "humidity_percent": cur.get("relative_humidity_2m"),
        "rainfall_mm":      cur.get("precipitation"),
        "wind_speed_kmh":   cur.get("wind_speed_10m"),
        "pressure_hpa":     cur.get("surface_pressure"),
        "weather_condition": code_to_condition(cur.get("weather_code")),
        "weather_code":     cur.get("weather_code"),
    }


def get_forecast(lat: float, lon: float) -> list[dict]:
    """
    Calls Open-Meteo /v1/forecast for 5-day daily forecast.
    Returns a list of dicts — one per day — NOT written to weather_records.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": DAILY_VARS,
        "forecast_days": 5,
        "timezone": "auto",
    }
    with httpx.Client(timeout=10) as client:
        resp = client.get(BASE, params=params)
        resp.raise_for_status()
    data = resp.json()
    daily = data.get("daily", {})
    dates          = daily.get("time", [])
    codes          = daily.get("weather_code", [])
    temp_max       = daily.get("temperature_2m_max", [])
    temp_min       = daily.get("temperature_2m_min", [])
    precip_sum     = daily.get("precipitation_sum", [])
    wind_max       = daily.get("wind_speed_10m_max", [])

    return [
        {
            "date":              dates[i] if i < len(dates) else None,
            "weather_condition": code_to_condition(codes[i] if i < len(codes) else None),
            "weather_code":      codes[i] if i < len(codes) else None,
            "temperature_max_c": temp_max[i] if i < len(temp_max) else None,
            "temperature_min_c": temp_min[i] if i < len(temp_min) else None,
            "precipitation_mm":  precip_sum[i] if i < len(precip_sum) else None,
            "wind_speed_max_kmh": wind_max[i] if i < len(wind_max) else None,
        }
        for i in range(len(dates))
    ]
