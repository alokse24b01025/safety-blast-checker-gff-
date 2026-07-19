from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import List
from bson import ObjectId
from datetime import datetime

from database_mongo import get_mongo_db
from schemas import SubmissionCreate, SubmissionResponse, OfficerReviewInput
from rule_engine import evaluate_blast_site
from ai_recommendations import generate_recommendation
from pdf_generator import build_checklist_pdf
from routes.auth import require_role

router = APIRouter(prefix="/api/submissions", tags=["Checklist Submissions"])

def serialize_doc(doc) -> dict:
    if not doc:
        return {}
    doc["id"] = str(doc["_id"])
    doc["submission_id"] = str(doc["_id"])
    del doc["_id"]
    
    # Format date fields to string if they are datetime objects
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat() + "Z"
    if isinstance(doc.get("reviewed_at"), datetime):
        doc["reviewed_at"] = doc["reviewed_at"].isoformat() + "Z"
        
    return doc

@router.post("", response_model=SubmissionResponse)
async def create_submission(payload: SubmissionCreate, db=Depends(get_mongo_db)):
    try:
        # Convert payload to dict
        data = payload.model_dump()
        
        # Evaluate using rule engine
        assessment = evaluate_blast_site(data)
        
        # Generate Claude recommendation
        ai_rec = await generate_recommendation(
            risk_level=assessment["risk_level"],
            total_score=assessment["total_score"],
            issues=assessment["issues"]
        )
        
        # Build mongo document
        submission_doc = {
            "site_name": payload.site_name,
            "blast_id": payload.blast_id,
            "blast_date": payload.blast_date,
            "total_score": assessment["total_score"],
            "risk_level": assessment["risk_level"],
            "critical_triggered": assessment["critical_triggered"],
            "issues": assessment["issues"],
            "ai_recommendation": ai_rec,
            "payload": data,
            "officer_decision": None,
            "officer_name": None,
            "officer_comments": None,
            "digital_signature": None,
            "reviewed_at": None,
            "created_at": datetime.utcnow()
        }
        
        result = await db["submissions"].insert_one(submission_doc)
        submission_doc["_id"] = result.inserted_id
        
        return serialize_doc(submission_doc)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process submission: {str(e)}"
        )

@router.get("", response_model=List[dict])
async def list_submissions(db=Depends(get_mongo_db)):
    try:
        cursor = db["submissions"].find().sort("created_at", -1)
        submissions = await cursor.to_list(length=100)
        return [
            {
                "id": str(sub["_id"]),
                "site_name": sub.get("site_name"),
                "blast_id": sub.get("blast_id"),
                "blast_date": sub.get("blast_date"),
                "total_score": sub.get("total_score"),
                "risk_level": sub.get("risk_level"),
                "created_at": sub.get("created_at").isoformat() + "Z" if isinstance(sub.get("created_at"), datetime) else str(sub.get("created_at"))
            }
            for sub in submissions
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list submissions: {str(e)}"
        )

@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(submission_id: str, db=Depends(get_mongo_db)):
    if not ObjectId.is_valid(submission_id):
        raise HTTPException(status_code=400, detail="Invalid submission ID format")
        
    doc = await db["submissions"].find_one({"_id": ObjectId(submission_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    return serialize_doc(doc)

@router.post("/{submission_id}/review")
async def review_submission(
    submission_id: str, 
    review: OfficerReviewInput, 
    db=Depends(get_mongo_db),
    current_user=Depends(require_role("OFFICER"))
):
    if not ObjectId.is_valid(submission_id):
        raise HTTPException(status_code=400, detail="Invalid submission ID format")
        
    doc = await db["submissions"].find_one({"_id": ObjectId(submission_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    # Validation 1: Irreversibility
    if doc.get("officer_decision") is not None:
        raise HTTPException(
            status_code=400,
            detail="Officer decision has already been recorded and is irreversible."
        )
        
    # Validation 2: Block APPROVED decisions on RED risk
    if review.decision == "APPROVED" and doc.get("risk_level") == "RED":
        raise HTTPException(
            status_code=400,
            detail="Cannot approve a blast checklist evaluated with RED risk level. Safety parameters must be corrected first."
        )
        
    update_data = {
        "officer_decision": review.decision,
        "officer_name": review.officer_name,
        "officer_comments": review.comments or None,
        "digital_signature": review.digital_signature,
        "reviewed_at": datetime.utcnow()
    }
    
    await db["submissions"].update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": update_data}
    )
    
    return {
        "submission_id": submission_id,
        "officer_decision": review.decision,
        "officer_name": review.officer_name,
        "officer_comments": review.comments or None,
        "reviewed_at": update_data["reviewed_at"].isoformat() + "Z"
    }

@router.get("/{submission_id}/pdf")
async def download_pdf(submission_id: str, db=Depends(get_mongo_db)):
    if not ObjectId.is_valid(submission_id):
        raise HTTPException(status_code=400, detail="Invalid submission ID format")
        
    doc = await db["submissions"].find_one({"_id": ObjectId(submission_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    # Format dates for PDF rendering
    doc_copy = dict(doc)
    doc_copy["id"] = str(doc_copy["_id"])
    if isinstance(doc_copy.get("created_at"), datetime):
        doc_copy["created_at"] = doc_copy["created_at"].strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(doc_copy.get("reviewed_at"), datetime):
        doc_copy["reviewed_at"] = doc_copy["reviewed_at"].strftime("%Y-%m-%d %H:%M:%S")
        
    pdf_bytes = build_checklist_pdf(doc_copy)
    filename = f"blast_checklist_{doc_copy.get('blast_id')}_{submission_id}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
