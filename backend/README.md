# SmogSlayer: Urban Air Quality Assistant

> **Beat the smog, one habit at a time.**

SmogSlayer is a GenAI-powered assistant for families and communities facing severe winter smog and urban air pollution. Enter your city, how you commute and who is at home, and it shows today's air quality, the best hour to step outside, and a personal plan of low-emission routines, indoor air tips and cleaner alternatives, with the CO2 impact of each choice.

**Vertical:** Challenge 6, Urban Air Quality Assistant. Helps families and communities handle winter smog and urban air pollution.

## How it works
1. The user enters a city, how they commute, and whether children, older adults or someone with asthma live at home.
2. `air.py` looks up the city and its live AQI and PM2.5 from Open-Meteo (cached for 30 minutes).
3. `impact.py` works out the AQI category and the CO2 saved by switching commute mode. Plain code does the maths, so the numbers are never made up.
4. `advice.py` sends those facts to Google Gemini (free-tier Flash model), which writes a low-emission routine, indoor air tips and sustainable alternatives that explain the impact. If Gemini is unavailable or replies in an unexpected shape, built-in tips are shown instead.

## Features
- A next-24-hours AQI strip with the cleanest and roughest hour, from Open-Meteo's hourly forecast.
- A daily low-emission pledge with a streak that is stored only on the user's device.
- Tips in English or Hindi, and a one-tap summary to share with family.

## Safety
- Alerts for unhealthy air are fixed text in `config.py`, never written by the AI.
- AI tips that contain medical terms or links are discarded and replaced by built-in tips.
- Every plan ends with a not-medical-advice note and an emergency reminder.
- Requests over 2 KB are rejected, and nothing a user enters is stored.

## Assumptions
- AQI values are Open-Meteo's modelled estimates, not readings from a local monitor.
- Emission factors in `config.py` are rough planning figures; a month is 22 working days and each commute is a round trip.
- Advice is general guidance, not medical advice.

## Security
Free text never reaches the model: the city is pattern-checked and everything else is a fixed choice or a bounded number. The API key lives in an environment variable. The app has rate limiting, a strict Content-Security-Policy, and renders all output with `textContent`.

## Run and test
```
pip install -r requirements.txt
export GEMINI_API_KEY=your-key   # optional; built-in tips are used without it
flask --app app run
python -m unittest -v
```

## Deploy on Render
Build command `pip install -r requirements.txt`, start command `gunicorn app:app`, and set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in the environment.

Gen AI service used: Google Gemini (`advice.py`). Air-quality data: Open-Meteo (CC BY 4.0).

## Frontend
The React UI lives in `../frontend` and calls `/api/plan`. Set `ALLOWED_ORIGINS` to the frontend address (comma-separated) so the browser may call this API.
