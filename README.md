# SmogSlayer: Urban Air Quality Assistant

> **Beat the smog, one habit at a time.**

SmogSlayer is a GenAI-powered assistant for families and communities facing severe winter smog and urban air pollution. Enter your city, how you commute and who is at home, and it shows today's air quality, the best hour to step outside, and a personal plan of low-emission routines, indoor air tips and cleaner alternatives, with the CO2 impact of each choice.

**Vertical:** Challenge 6, Urban Air Quality Assistant.

## Approach and logic
1. The React page (`frontend/`) sends the city, commute, distance, household and language to the Flask API (`backend/`).
2. The API looks up live AQI, PM2.5 and a 24-hour forecast from Open-Meteo (cached for 30 minutes).
3. Plain code works out the AQI category, the safety alert, the best and worst hour, and the CO2 saved by switching commute mode, so numbers are never invented by the AI.
4. Google Gemini (free-tier Flash model) turns those facts into tips in English, Hindi or Hinglish. If Gemini fails, or its tips contain medical terms or links, built-in tips are shown instead.

## Features
- Live AQI and PM2.5 for any city, with a 24-hour outlook and the best time to be outside.
- Red safety alerts for unhealthy air, written as fixed text and never by the AI.
- Commute CO2 impact and the saving from each cleaner option.
- A daily low-emission routine with a streak that is saved only in the user's browser.
- One-tap summary to share. Animated mist-and-lightning intro.

## Safety and security
- Not medical advice: every plan says so and reminds users to call their local emergency number for breathing trouble.
- Inputs are validated, requests are size-limited and rate-limited, and the API key stays in an environment variable.
- Free text never reaches the model. Nothing a user enters is stored.

## Assumptions
- AQI values are Open-Meteo's modelled estimates, not readings from a local monitor.
- Emission factors in `backend/config.py` are rough planning figures; a month is 22 working days and each commute is a round trip.

## Run locally
```
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 -m unittest
ALLOWED_ORIGINS=http://localhost:8080 flask --app app run --port 5001

cd ../frontend          # in a second terminal
npm install && npm run dev
```
Set `GEMINI_API_KEY` for AI-written tips; without it the built-in tips are used. If the frontend runs on another port, use that address in `ALLOWED_ORIGINS`.

## Gen AI and data used
Google Gemini (`backend/advice.py`). Air-quality data: Open-Meteo (CC BY 4.0).
