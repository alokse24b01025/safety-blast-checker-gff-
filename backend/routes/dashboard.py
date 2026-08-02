from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from datetime import datetime, timedelta
from collections import Counter

from database_mongo import get_mongo_db
from database_sql import get_db
from models_sql import IncidentLog, BlastPlan

router = APIRouter(prefix="/api/dashboard", tags=["Executive Dashboard"])


@router.get("/summary")
async def dashboard_summary(mongo_db=Depends(get_mongo_db), sql_db: Session = Depends(get_db)):
    """
    Aggregates KPIs for the executive dashboard:
      - Submission counts by risk level (Green/Yellow/Orange/Red)
      - Approval / rejection / pending breakdown
      - Average risk score trend (last 14 days)
      - Top flagged issues across all submissions
      - Incident count and severity breakdown (from PostgreSQL)
      - Total blast plans designed (from PostgreSQL)
    """
    cursor = mongo_db["submissions"].find()
    submissions = await cursor.to_list(length=10000)

    total_submissions = len(submissions)

    # --- Overall average score (for the live status core) -----------
    all_scores = [s.get("total_score", 0) for s in submissions]
    avg_score_overall = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0

    # --- Risk level breakdown -------------------------------------
    risk_counts = Counter(s.get("risk_level") for s in submissions)
    risk_level_breakdown = {
        "GREEN": risk_counts.get("GREEN", 0),
        "YELLOW": risk_counts.get("YELLOW", 0),
        "ORANGE": risk_counts.get("ORANGE", 0),
        "RED": risk_counts.get("RED", 0),
    }

    # --- Officer decision breakdown ---------------------------------
    decision_counts = Counter(s.get("officer_decision") for s in submissions)
    decision_breakdown = {
        "APPROVED": decision_counts.get("APPROVED", 0),
        "REJECTED": decision_counts.get("REJECTED", 0),
        "PENDING": decision_counts.get(None, 0),
    }

    # --- Average score trend, last 14 days --------------------------
    today = datetime.utcnow().date()
    trend = []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        day_scores = [
            s.get("total_score", 0) for s in submissions
            if isinstance(s.get("created_at"), datetime) and s["created_at"].date() == day
        ]
        avg_score = round(sum(day_scores) / len(day_scores), 1) if day_scores else 0
        trend.append({
            "date": day.isoformat(),
            "avg_score": avg_score,
            "submissions": len(day_scores),
        })

    # --- Top flagged issues across all submissions -------------------
    issue_counter = Counter()
    for s in submissions:
        for issue in s.get("issues", []):
            issue_counter[issue.get("description", issue.get("code", "Unknown"))] += 1
    top_issues = [
        {"issue": desc, "count": count}
        for desc, count in issue_counter.most_common(5)
    ]

    # --- Critical trigger rate ---------------------------------------
    critical_count = sum(1 for s in submissions if s.get("critical_triggered"))

    # --- Incidents (PostgreSQL) ---------------------------------------
    total_incidents = sql_db.query(IncidentLog).count()
    severity_rows = (
        sql_db.query(IncidentLog.severity, sql_func.count(IncidentLog.id))
        .group_by(IncidentLog.severity)
        .all()
    )
    incident_severity_breakdown = {sev: count for sev, count in severity_rows}

    # --- Blast plans designed (PostgreSQL) -----------------------------
    total_blast_plans = sql_db.query(BlastPlan).count()

    return {
        "total_submissions": total_submissions,
        "avg_score_overall": avg_score_overall,
        "risk_level_breakdown": risk_level_breakdown,
        "decision_breakdown": decision_breakdown,
        "critical_trigger_count": critical_count,
        "critical_trigger_rate_pct": (
            round(100 * critical_count / total_submissions, 1) if total_submissions else 0
        ),
        "score_trend_14d": trend,
        "top_flagged_issues": top_issues,
        "total_incidents": total_incidents,
        "incident_severity_breakdown": incident_severity_breakdown,
        "total_blast_plans": total_blast_plans,
    }