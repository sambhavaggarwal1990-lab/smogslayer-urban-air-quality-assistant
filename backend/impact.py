"""Turn AQI and commute choices into numbers people can act on."""
from config import AQI_BANDS, EMISSION_KG_PER_KM, WORKING_DAYS_PER_MONTH


def aqi_category(aqi):
    return next(label for limit, label in AQI_BANDS if aqi <= limit)


def monthly_co2_kg(mode, one_way_km):
    """Round-trip commute emissions for one month."""
    return round(EMISSION_KG_PER_KM[mode] * one_way_km * 2 * WORKING_DAYS_PER_MONTH, 1)


def commute_impact(mode, one_way_km):
    """Monthly emissions now, plus the saving from each cleaner mode (biggest first)."""
    current = monthly_co2_kg(mode, one_way_km)
    savings = {alt: current - monthly_co2_kg(alt, one_way_km) for alt in EMISSION_KG_PER_KM}
    switches = [
        {"mode": alt, "saves_kg": round(saved, 1)}
        for alt, saved in sorted(savings.items(), key=lambda item: -item[1])
        if saved > 0
    ]
    return {"mode": mode, "monthly_co2_kg": current, "switches": switches}


def outlook(hours):
    """Next-hours rows plus the cleanest and roughest hour, or None without a forecast."""
    if not hours:
        return None
    rows = [{"label": label, "aqi": aqi, "category": aqi_category(aqi)} for label, aqi in hours]
    return {"hours": rows, "best": min(rows, key=lambda r: r["aqi"]), "worst": max(rows, key=lambda r: r["aqi"])}
