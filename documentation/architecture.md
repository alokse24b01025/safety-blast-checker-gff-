# Architecture — AI Blast Safety Assistant

## 1. Problem understanding

Blasting is one of mining's highest-risk operations. Pre-blast checks
span weather, personnel, equipment, and site conditions, and a single
missed check can cause injury, flyrock, or equipment damage. Today this
is typically a manual paper checklist, which is:

- Slow to cross-reference against multiple thresholds at once
- Prone to inconsistent judgement between shifts/supervisors
- Hard to audit after the fact (no structured record of *why* a blast
  was or wasn't approved)

This system does not replace the blasting officer's judgement. It gives
them a fast, consistent, explainable first pass: capture the data once,
apply the same rules every time, surface what's wrong in plain language,
and leave a paper trail — while the actual approval authority never
leaves the human.

## 2. System architecture

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────────┐
│   React Frontend     │ ────────────────────────▶│    FastAPI Backend       │
│  (Vite, single page) │◀──────────────────────── │                          │
│                      │                            │  ┌────────────────────┐ │
│  - Checklist form     │                            │  │  Rule Engine        │ │
│  - Risk beacon         │                            │  │  (deterministic)    │ │
│  - AI recommendation   │                            │  └─────────┬──────────┘ │
│  - History dashboard   │                            │            │            │
│  - Officer review UI    │                            │  ┌─────────▼──────────┐ │
│  - PDF download link     │                           │  │  AI Recommendation │ │
└──────────────────────┘                            │  │  (Claude API call)  │ │
                                                       │  └─────────┬──────────┘ │
                                                       │            │            │
                                                       │  ┌─────────▼──────────┐ │
                                                       │  │  PDF Generator      │ │
                                                       │  │  (reportlab)        │ │
                                                       │  └────────────────────┘ │
                                                       │            │            │
                                                       │  ┌─────────▼──────────┐ │
                                                       │  │  SQLite (SQLAlchemy)│ │
                                                       │  └────────────────────┘ │
                                                       └──────────────────────────┘
                                                                    │
                                                         ┌──────────▼──────────┐
                                                         │  Anthropic Claude    │
                                                         │  API (external)      │
                                                         └──────────────────────┘
```

### Request flow for a submission

1. Supervisor fills out the checklist form in the React frontend.
2. Frontend `POST`s the payload to `/api/submissions`.
3. FastAPI validates the payload against a Pydantic schema (rejects
   anything malformed or missing before it reaches any logic).
4. The validated data is passed to `evaluate_blast_site()` in the rule
   engine, which returns a score, a risk band, and a list of flagged
   issues. This step is 100% deterministic — same input always produces
   the same output.
5. The rule engine's output is passed to `generate_recommendation()`,
   which calls the Claude API to phrase the issues into plain-language
   guidance. If the API is unavailable, a templated fallback is used
   instead — the app never fails just because the AI call failed.
6. The submission, risk assessment, and AI text are persisted to SQLite.
7. The full assessment is returned to the frontend, which renders the
   risk beacon, the issue list, and the AI recommendation.
8. The blasting officer reviews it and posts a decision to
   `/api/submissions/{id}/review` — a completely separate, human-only
   write path.
9. Anyone can download a PDF checklist from
   `/api/submissions/{id}/pdf`, which renders the full record including
   the officer's decision (or a blank sign-off block if not yet
   reviewed).

## 3. Why these design choices

- **Deterministic rule engine, not an ML model, for the risk decision.**
  Blast safety classifications must be explainable and legally
  defensible. A rule engine can be audited line by line; a trained
  classifier's decision boundary cannot be justified as easily to a
  regulator or in an incident investigation.
- **AI is a separate, downstream step.** By calling the rule engine
  first and passing its output into the AI prompt, the AI is
  structurally prevented from inventing its own risk assessment — it
  can only explain what the rules already decided.
- **Officer review is a distinct database field and endpoint.** This
  makes "AI never approves" a property of the code, not just a policy
  stated in the UI.
- **SQLite for now, swappable later.** All persistence goes through
  SQLAlchemy against a single `DATABASE_URL` — moving to Postgres for a
  real deployment is a one-line config change.
- **Conservative handling of missing data.** If a checklist field is
  left blank in a way that resolves to "no"/"false", it is treated as a
  failed check, not skipped, so an incomplete submission cannot produce
  an artificially safe score.

## 4. Wireframe (text description)

**Main screen, two columns:**

- Left column: the checklist intake form, grouped into fieldsets
  (Site, Weather, Shift, Workforce, Equipment, Site conditions, Notes),
  each toggle/field mapped 1:1 to a rule engine input.
- Right column: a sticky results panel —
  - A "hazard beacon": four stacked lights (Red/Orange/Yellow/Green),
    only the current risk level illuminated, next to the numeric score.
  - A list of flagged issues, sorted by weight, critical ones marked.
  - The AI-generated recommendation, labelled "Advisory Only".
  - An officer sign-off box: name, comments, and Approve/Hold/Reject
    buttons.
  - A "Download PDF Checklist" button.
- Below both columns: a full-width submission history table (site,
  blast ID, date, score, risk level, a "View" button to reload any past
  submission into the results panel).

## 5. Integration into the larger mining intelligence platform

Per the "Bigger Picture" diagram in the assignment brief, this module is
the **Blast Safety Checklist Module** (operational safety and risk
assessment). It is built so it can plug into future platform modules
without rework:

- The backend is a stateless REST API — any future Operations Dashboard
  can consume `/api/submissions` directly for a cross-site view.
- The rule engine is a pure function (`dict in -> RiskAssessment out`)
  with no framework dependency, so it could be imported directly by a
  future Blast Design Optimisation module to pre-check a design before
  it's even scheduled.
- The submission schema captures a `blast_id`, which is designed to be
  the join key against a future Equipment Monitoring module (e.g. to
  auto-fill "detonators secure" / "siren working" from live sensor
  status instead of manual entry).
- Worker count and exclusion zone data are structured so a future
  Worker Safety Module could feed live headcount/geofencing data into
  this form automatically rather than requiring manual re-entry.
