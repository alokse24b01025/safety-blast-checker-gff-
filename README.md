# AI Blast Safety Assistant

A rule-based, AI-assisted pre-blast safety evaluation system for mining blasting operations, built for the GFF AI Academy Enterprise Solution assignment (Alok's module).

> **Mandatory disclaimer:** This is a student prototype for learning and demonstration only. It is a decision-support aid and does **not** constitute blast approval. All operational use requires review and sign-off by an appropriately qualified, authorised blasting professional in accordance with applicable laws and site safety standards.

## What it does

1. **Blast Safety Checklist:** Captures pre-blast site information across five categories (Weather, Shift, Workforce, Equipment, Site). Runs data through a deterministic rule engine that evaluates safety parameters and calculates a risk score and risk band (Green / Yellow / Orange / Red).
2. **AI Safety Recommendations:** Sends rule engine findings to Claude (Anthropic API) to generate corrective advice for the supervisor.
3. **Blasting Officer Review:** Authorised blasting officers can log in, review submissions, draw a digital signature on a canvas, record their final approval, and download a signed audit PDF report.
4. **Blast Design Optimisation:** Configures spacing, burden, bench height, and charging delays. Simulates expected fragmentation sizes and environmental impacts (flyrock risk, vibration PPV, air blast noise) and draws dynamic layouts and distribution charts.
5. **Incident Registers & Auditing:** Logs active safety violations or accidents on site and correlates them with pre-blast checklist reports.

## Project Structure

```text
blast-safety-assistant/
├── backend/                  # Python FastAPI REST API Backend
│   ├── routes/               # API endpoint route handlers
│   │   ├── auth.py           # JWT Authentication & Default User Seeding
│   │   ├── checklist.py      # Checklist Intake & Officer Review Flows
│   │   ├── blast_design.py   # Pattern Design & Sim/Optimisation
│   │   └── incidents.py      # Active Safety Violation Logging
│   ├── tests/                # Pytest unit tests for safety logic
│   │   └── test_rule_engine.py
│   ├── data/                 # Sample data files
│   ├── main.py               # Uvicorn FastAPI Server entrypoint
│   ├── config.py             # Settings & Environment variables
│   ├── database_sql.py       # SQLite connection setup (via SQLAlchemy)
│   ├── database_mongo.py     # MongoDB connection setup (via Motor)
│   ├── models_sql.py         # SQLAlchemy SQL models
│   ├── schemas.py            # Pydantic validation schemas
│   ├── rule_engine.py        # Deterministic safety risk engine
│   ├── ai_recommendations.py # AI advisory engine (Claude API)
│   ├── pdf_generator.py      # ReportLab PDF checklist generator
│   └── requirements.txt      # Python dependencies
├── documentation/            # Wireframes, architecture notes, and PDFs
└── frontend/                 # React (Vite) + TypeScript Frontend
    ├── src/
    │   ├── App.tsx           # Multi-tab layout, theme and authentication
    │   ├── components/       # UI module components (ChecklistTab, BlastDesignTab, IncidentLogsTab, RiskBeacon, BlastVisualizer, etc.)
    │   ├── api/client.ts     # Backend API client fetches
    │   └── main.jsx          # Entry point
    └── package.json          # Node configuration & dependencies
```

## Running it locally

### 1. Backend Server

Ensure you have a MongoDB instance running locally (defaults to `mongodb://localhost:27017/blast_safety`) or configure a custom URI in `backend/.env`.

```bash
cd backend
python -m venv .venv
# Activate virtual environment:
# Windows (PowerShell): .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate

pip install -r requirements.txt
python main.py
```
The API is now running at `http://localhost:8000`.

### 2. Frontend Development Server

```bash
cd frontend
npm install
npm run dev
```
The app is now running at `http://localhost:5173`.

### 3. Docker Compose (Alternative)

To build and launch the entire stack (PostgreSQL, MongoDB, Backend, and Frontend) in containers:
```bash
docker-compose up --build
```

---

## API Summary

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in and receive a JWT token |
| POST | `/api/submissions` | Submit a checklist, get risk assessment + AI recommendation |
| GET | `/api/submissions` | List safety submission history |
| POST | `/api/submissions/{id}/review` | Record the authorised officer's signed decision |
| GET | `/api/submissions/{id}/pdf` | Download the signed safety checklist as a PDF |
| POST | `/api/blast-plan/generate` | Simulate blast design and calculate fragmentation curve |
| POST | `/api/blast-plan/optimise` | Fetch optimized burden, spacing, and powder factor suggestions |
| POST | `/api/incidents` | Record an active safety incident |
| GET | `/api/incidents/list` | List logged compliance incidents |

---

## Risk Scoring Model

* **Critical Rules (Force RED regardless of score):**
  * Lightning warning active
  * Workers inside the exclusion zone
  * No authorised blasting officer available on site
  * Detonators are not secure
* **Weighted Contributors:**
  * Blast design not approved: `40`
  * Exclusion zone not established: `30`
  * Warning siren not working: `30`
  * Communication system not working: `25`
  * Barricades not in place: `25`
  * Safety briefing incomplete: `20`
  * Emergency vehicle unavailable: `20`
  * Escape route not clear: `20`
  * Supervisor unavailable: `15`
  * Wind speed > 30 km/h: `15`
  * Rainfall > 10 mm: `15`
  * Worker count exceeds site safe limit: `10`
  * Temperature outside 0-45°C: `10`
* **Risk Bands:** Green `0-15` · Yellow `16-40` · Orange `41-70` · Red `71+`

All weights and thresholds are constants in `backend/rule_engine.py` and can be adjusted without changing frontend code.

---

## Ethical & Safety Considerations

* **Decisions are Human:** The system is explicitly designed so the AI cannot make or record approval decisions. The official approval field can only be signed and committed by a verified, logged-in Blasting Officer.
* **Conservative Rule Checks:** Unanswered or missing checks default to the unsafe state to ensure safety checklists fail-safely rather than skipping issues.
* **Secure Storage:** Passwords are fully hashed with salt using bcrypt. No API keys or connection strings are hardcoded in the codebase, they are loaded via env files.
