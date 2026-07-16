# AI Blast Safety Assistant

A rule-based, AI-assisted pre-blast safety evaluation system for mining
blasting operations, built for the GFF AI Academy Enterprise Solution
assignment (Alok's module).

> **Mandatory disclaimer:** This is a student prototype for learning and
> demonstration only. It is a decision-support aid and does **not**
> constitute blast approval. All operational use requires review and
> sign-off by an appropriately qualified, authorised blasting professional
> in accordance with applicable laws and site safety standards.

## What it does

1. Captures pre-blast site information across five categories: Weather,
   Shift, Workforce, Equipment, Site.
2. Runs the data through a **deterministic rule engine** that evaluates
   each safety parameter and computes a weighted risk score.
3. Classifies overall risk as **Green / Yellow / Orange / Red**. Certain
   critical conditions (lightning warning, workers inside the exclusion
   zone, no available officer, insecure detonators) trigger an automatic
   **Red** regardless of the accumulated score.
4. Sends the rule engine's findings to Claude (Anthropic API) to generate
   a plain-language, corrective **recommendation** for the site team. The
   AI never decides the risk level — it only explains it.
5. Records the checklist, the risk assessment, and the AI recommendation
   in a database, and exposes it on a submission history dashboard.
6. Lets an **authorised blasting officer** record their own decision
   (Approve / Hold / Reject) on top of the AI's output. This is the only
   field in the system that represents a real approval.
7. Generates a downloadable **PDF pre-blast safety checklist**, including
   an officer sign-off block.

## Why AI recommends but never decides

The rule engine (`model/rule_engine.py`) is the single source of truth
for the risk score and risk band. It is deterministic, auditable, and
tunable by adjusting constants — it does not use machine learning, by
design, because blast safety go/no-go logic must be explainable and
reproducible. The AI layer (`model/ai_recommendations.py`) is called only
*after* the rule engine has already made its decision; its job is purely
to phrase the findings as clear, actionable guidance. The AI cannot
change the score, cannot change the risk band, and cannot record an
approval — only the `/review` endpoint, filled in by a human officer, can
do that.

## Project structure

```
blast-safety-assistant/
├── backend/                # Node.js Express application
│   ├── app/                # Express sub-modules & helpers
│   │   ├── database.js     # MongoDB connection setup
│   │   └── pdf_generator.js # PDF checklist rendering (pdfkit)
│   ├── model/              # Database models and rules
│   │   ├── Submission.js   # Mongoose submission schema
│   │   ├── rule_engine.js  # Deterministic risk scoring rules
│   │   └── ai_recommendations.js # AI recommendation prompt & call
│   ├── tests/              # Jest tests for backend safety logic
│   ├── data/               # Sample submissions for demo/testing
│   ├── package.json        # Node dependencies & test configuration
│   ├── package-lock.json   # Node package lock file
│   ├── .env                 # Backend environment settings
│   └── server.js           # Entry point & Express routing
├── documentation/          # Architecture notes, wireframes
└── frontend/               # React (Vite) single-page application
    └── src/
        ├── App.jsx
        ├── components/     # ChecklistForm, RiskBeacon, ResultPanel, HistoryTable
        └── api/client.js   # Backend API client
```

## Running it locally

You can run both servers concurrently from the root directory, or run them individually in separate terminal windows.

### Run both concurrently (recommended)

From the root directory, run:
```bash
npm run dev
```
This starts both the frontend and backend development servers simultaneously.

### Run individually

#### Backend

Ensure you have a MongoDB instance running locally (defaults to `mongodb://localhost:27017/blast_safety`) or configure a custom URI in `backend/.env`.

```bash
cd backend
npm install
npm run dev
```

The API is now running at `http://localhost:8000`.

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app is now running at `http://localhost:5173`.

### Tests

```bash
cd backend
npm test
```

30 tests covering the rule engine's scoring logic (critical rules, weighted
accumulation, band thresholds, edge cases) and the API (validation,
persistence, PDF generation, officer review flow).

## API summary

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/submissions` | Submit a checklist, get risk assessment + AI recommendation |
| GET | `/api/submissions` | List submission history |
| GET | `/api/submissions/{id}` | Get one submission's full detail |
| POST | `/api/submissions/{id}/review` | Record the authorised officer's decision |
| GET | `/api/submissions/{id}/pdf` | Download the checklist as a PDF |
| GET | `/health` | Health check |

## Risk scoring model

**Critical rules (force Red regardless of score):**
- Lightning warning detected
- Workers inside the exclusion zone
- No authorised blasting officer available
- Detonators not secure

**Weighted contributors:**

| Factor | Weight |
|---|---|
| Blast design not approved | 40 |
| Exclusion zone not established | 30 |
| Warning siren not working | 30 |
| Communication system not working | 25 |
| Barricades not in place | 25 |
| Safety briefing incomplete | 20 |
| Emergency vehicle unavailable | 20 |
| Escape route not clear | 20 |
| Supervisor unavailable | 15 |
| Wind speed > 30 km/h | 15 |
| Rainfall > 10 mm | 15 |
| Worker count exceeds site safe limit | 10 |
| Temperature outside 0-45°C | 10 |

**Bands (when no critical rule fires):** Green 0-15 · Yellow 16-40 ·
Orange 41-70 · Red 71+

All weights and thresholds are named constants in `backend/model/rule_engine.js`
and can be tuned without touching any other code.

## Known limitations & future scope

- Rule weights are illustrative and were set for this assignment, not
  sourced from a real mine safety standard; a production deployment
  would need these calibrated with domain experts against real
  regulatory thresholds (e.g. DGMS, MSHA).
- The AI recommendation layer depends on the Anthropic API; a fallback
  templated recommendation is used when no key is configured or the
  call fails, but its language is far more basic.
- No authentication/authorization layer yet — anyone with the URL can
  submit checklists or record officer reviews. A production version
  needs role-based access control so only verified blasting officers
  can submit a review.
- SQLite is used for simplicity; a production/enterprise deployment
  should move to PostgreSQL (only `DATABASE_URL` needs to change).
- As outlined in the assignment's "bigger picture" diagram, this module
  is designed to plug into a larger mining intelligence platform
  alongside Worker Safety, Equipment Monitoring, Blast Design
  Optimisation, and a shared Operations Dashboard. The API is kept
  RESTful and stateless (aside from the DB) specifically so it can be
  consumed by that future platform.

## Ethical & safety considerations

- The system is explicitly designed so the AI cannot make or record an
  approval decision — this is enforced at the code level, not just in
  the UI, since the officer review is a separate, distinct database
  field that only a dedicated endpoint can set.
- Every generated PDF carries a visible disclaimer stating this is a
  decision-support tool, not an approval document.
- Unanswered/missing safety checks are treated conservatively (as
  failing checks), not silently skipped, so incomplete data cannot
  produce an artificially low risk score.
