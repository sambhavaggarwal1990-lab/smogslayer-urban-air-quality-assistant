"""Settings and lookup tables, all in one place.

Keeping numbers and texts here means they are easy to review and change without touching the logic.
"""

# --- Air quality bands ----------------------------------------------------------------------------
# US AQI scale. Each pair is (highest AQI in the band, label); bands are checked from the lowest up.
AQI_BANDS: tuple[tuple[float, str], ...] = (
    (50, "Good"),
    (100, "Moderate"),
    (150, "Unhealthy for sensitive groups"),
    (200, "Unhealthy"),
    (300, "Very unhealthy"),
    (float("inf"), "Hazardous"),
)

# --- Commute emissions -----------------------------------------------------------------------------
# Rough planning figures in kg of CO2e per passenger-km. Replace with cited local data before relying on them.
EMISSION_KG_PER_KM: dict[str, float] = {
    "car": 0.17,
    "motorbike": 0.10,
    "bus": 0.08,
    "metro": 0.04,
    "walk_or_cycle": 0.0,
}
COMMUTE_MODES: tuple[str, ...] = tuple(EMISSION_KG_PER_KM)
WORKING_DAYS_PER_MONTH = 22  # used to turn a daily commute into a monthly figure
MAX_ONE_WAY_KM = 100         # largest distance the API accepts

# --- Languages for the tips ---------------------------------------------------------------------------
# Code -> name used inside the Gemini prompt.
LANGUAGES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "hinglish": "Hinglish (Hindi written in English letters)",
}
LANGUAGE_CODES: tuple[str, ...] = tuple(LANGUAGES)

# --- Safety messages ---------------------------------------------------------------------------------
# Fixed texts, never written by the AI, so they cannot be wrong or invented. Keyed by AQI category.
SAFETY_ALERTS: dict[str, str] = {
    "Unhealthy for sensitive groups": "Air is unhealthy for sensitive groups. Children, older adults and people with asthma or heart conditions should limit time outdoors.",
    "Unhealthy": "Air is unhealthy for everyone. Cut back on outdoor exertion and keep windows closed.",
    "Very unhealthy": "Air is very unhealthy. Stay indoors where you can and skip outdoor exercise.",
    "Hazardous": "Air is hazardous. Stay indoors with windows shut and avoid all outdoor activity.",
}
# Added to the routine when the household includes children, older adults or someone with asthma.
SENSITIVE_TIP = "Children, older adults and people with asthma should keep outdoor time short and avoid busy roads."

# --- Built-in tips ---------------------------------------------------------------------------------------
# Shown when Gemini is unavailable. Tiers: "ok" (AQI <= 100), "poor" (<= 200), "severe" (above 200).
FALLBACK_TIPS: dict[str, dict[str, list[str]]] = {
    "ok": {
        "routine": ["Walk, cycle or take public transport for short trips.", "Avoid idling your engine while you wait."],
        "indoor": ["Open windows while outdoor air is good.", "Dust with a damp cloth instead of dry sweeping."],
        "alternatives": ["Carpool or use the metro for longer trips.", "Swap short car trips for walking or cycling."],
    },
    "poor": {
        "routine": ["Exercise early or after rain, away from busy roads.", "Combine errands into one trip to cut vehicle use."],
        "indoor": ["Keep windows shut near rush hour and run a HEPA purifier if you have one.", "Avoid incense, candles and mosquito coils indoors."],
        "alternatives": ["Choose the metro or a bus over a car or motorbike.", "Carpool with neighbours or colleagues."],
    },
    "severe": {
        "routine": ["Stay indoors as much as you can and move workouts inside.", "If you must go out, wear a well-fitted N95 or FFP2 mask."],
        "indoor": ["Seal gaps, keep windows shut and run a HEPA purifier on high.", "Mop damp instead of sweeping, and never burn waste or wood."],
        "alternatives": ["Work from home or share rides today if you can.", "Skip the car for any trip a metro or bus can cover."],
    },
}
