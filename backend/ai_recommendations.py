import os
import logging
import httpx
from typing import Tuple
from anthropic import Anthropic
from config import settings

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "This is an AI-generated recommendation only. Final approval for this "
    "blast must come from an authorised blasting officer in accordance "
    "with site safety standards and applicable law."
)

def fallback_recommendation(risk_level: str, issues: list) -> str:
    if not issues:
        return (
            f"Risk level: {risk_level}. All checked safety parameters are within "
            f"acceptable limits. No corrective action identified by the rule engine. "
            f"{DISCLAIMER}"
        )

    sorted_issues = sorted(issues, key=lambda x: x.get('weight', 0), reverse=True)
    lines = [f"Risk level: {risk_level}. The following issues require attention before proceeding:"]
    
    for issue in sorted_issues:
        tag = '[CRITICAL] ' if issue.get('critical') else ''
        lines.append(f"- {tag}{issue.get('description')} (Suggested action: resolve before re-submission.)")
    
    lines.append(DISCLAIMER)
    return "\n".join(lines)

async def generate_recommendation(risk_level: str, total_score: int, issues: list) -> Tuple[str, bool, str]:
    """Generates safety recommendation. Auto-detects Anthropic vs Gemini credentials."""
    api_key = settings.ANTHROPIC_API_KEY
    model_name = settings.ANTHROPIC_MODEL

    if not api_key:
        logger.info("AI API Key not set; using fallback templated recommendation.")
        return fallback_recommendation(risk_level, issues), False, "NONE"

    issue_lines = "\n".join(
        f"- {'[CRITICAL] ' if i.get('critical') else ''}{i.get('description')} (weight: {i.get('weight')})"
        for i in issues
    ) if issues else "No issues flagged."

    prompt = f"""You are a mine blasting safety assistant. A deterministic rule engine
(not you) has already classified this pre-blast checklist submission.
Rule engine output:
- Risk level: {risk_level}
- Total risk score: {total_score}
- Flagged issues:
{issue_lines}

Write a short, clear, professional recommendation (max 150 words) for the
blast site supervisor explaining what needs to be corrected before the
authorised blasting officer can review this submission. Be specific and
actionable. Do not invent additional issues beyond what is listed. Do not
state or imply that you are approving or denying the blast -- only the
authorised blasting officer can do that. End with one sentence reminding
the reader that this is an AI-generated recommendation and final approval
rests with the authorised blasting officer."""

    # 1. Check if key is Anthropic (starts with sk-ant-)
    if api_key.strip().startswith("sk-ant-"):
        logger.info("Calling Anthropic Claude API...")
        try:
            client = Anthropic(api_key=api_key)
            response = client.messages.create(
                model=model_name or "claude-3-5-sonnet-latest",
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}]
            )
            text = "".join(block.text for block in response.content if block.type == "text").strip()
            if text:
                return text, True, "CLAUDE 3.5"
            return fallback_recommendation(risk_level, issues), False, "NONE"
        except Exception as e:
            logger.warning(f"Anthropic API error, using fallback recommendation: {str(e)}")
            return fallback_recommendation(risk_level, issues), False, "NONE"

    # 2. Otherwise, treat it as a Google Gemini key (default)
    else:
        logger.info("Calling Google Gemini API...")
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={api_key.strip()}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ]
            }
            async with httpx.AsyncClient(timeout=15.0) as httpx_client:
                response = await httpx_client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text:
                    return text, True, "GEMINI 3.1"
                return fallback_recommendation(risk_level, issues), False, "NONE"
        except Exception as ge:
            logger.warning(f"Gemini API error, using fallback recommendation: {str(ge)}")
            return fallback_recommendation(risk_level, issues), False, "NONE"
