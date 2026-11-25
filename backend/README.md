# SmogSlayer API

A small Flask JSON API. The React frontend (`../frontend`) calls it; it has no pages of its own.

## Endpoints
| Method and path | What it does |
|---|---|
| `POST /api/plan` | Takes a city, commute and household, returns live air quality, a safety alert, a 24-hour outlook, commute CO2 impact and tips |
| `GET /health` | Status check used by the hosting platform |
| `GET /` | A short description of the API |

## Code map
| File | Responsibility |
|---|---|
| `app.py` | Routes, security headers, CORS and JSON error handling |
| `validate.py` | Checks the request body; free text never reaches the AI |
| `air.py` | Finds a city and reads live AQI and the 24-hour forecast from Open-Meteo (cached 30 minutes) |
| `impact.py` | AQI categories, commute CO2 savings and the best/worst hour. Pure functions |
| `advice.py` | Asks Gemini for tips, blocks medical claims and links, and falls back to built-in tips |
| `config.py` | Every table and fixed text: AQI bands, emission factors, safety alerts, built-in tips |

## Run and test
```
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # add your Gemini key; without it the built-in tips are used
flask --app app run --port 5001
python3 -m unittest -v      # 70 tests, no network needed
```

## Settings (environment variables)
- `GEMINI_API_KEY`: your free Google AI Studio key. Keep it server-side only.
- `GEMINI_MODEL`: first model to try (default `gemini-3.5-flash-lite`); `gemini-flash-latest` is the backup.
- `ALLOWED_ORIGINS`: comma-separated websites allowed to call the API from a browser.

## Deploy on Render
Root directory `backend`, build command `pip install -r requirements.txt`, start command
`gunicorn app:app --workers 1 --threads 4 --timeout 90`.
