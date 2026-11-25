"""Turn AQI readings and commute choices into numbers people can act on. Pure functions, no network."""
from config import AQI_BANDS, EMISSION_KG_PER_KM, WORKING_DAYS_PER_MONTH


def aqi_category(aqi: float) -> str:
    """Name of the US AQI band that `aqi` falls in, for example 'Unhealthy'."""
    return next(label for limit, label in AQI_BANDS if aqi <= limit)


def monthly_co2_kg(mode: str, one_way_km: float) -> float:
    """CO2e of a round-trip commute repeated on every working day of a month, in kg."""
    return round(EMISSION_KG_PER_KM[mode] * one_way_km * 2 * WORKING_DAYS_PER_MONTH, 1)


def commute_impact(mode: str, one_way_km: float) -> dict:
    """Monthly emissions for `mode`, plus what switching to each cleaner mode would save (biggest saving first)."""
    current = monthly_co2_kg(mode, one_way_km)
    savings = {other: current - monthly_co2_kg(other, one_way_km) for other in EMISSION_KG_PER_KM}
    switches = [
        {"mode": other, "saves_kg": round(saved, 1)}
        for other, saved in sorted(savings.items(), key=lambda item: -item[1])
        if saved > 0  # skip the same mode and anything dirtier
    ]
    return {"mode": mode, "monthly_co2_kg": current, "switches": switches}


def outlook(hours: tuple[tuple[str, int], ...]) -> dict | None:
    """Turn (label, AQI) pairs into rows with a category, plus the cleanest and roughest hour.

    Returns None when there is no forecast, so the frontend can simply hide that section.
    """
    if not hours:
        return None
    rows = [{"label": label, "aqi": aqi, "category": aqi_category(aqi)} for label, aqi in hours]
    return {
        "hours": rows,
        "best": min(rows, key=lambda row: row["aqi"]),   # ties resolve to the earliest hour
        "worst": max(rows, key=lambda row: row["aqi"]),
    }
