import os
import logging
from anthropic import Anthropic

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

async def generate_recommendation(risk_level: str, total_score: int, issues: list) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    model_name = os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")

    if not api_key:
        logger.info("ANTHROPIC_API_KEY not set; using fallback templated recommendation.")
        return fallback_recommendation(risk_level, issues)

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

    try:
        # Note: Anthropic client initialization and sync/async call
        # Since we use fastapi we can initialize inside the function or globally.
        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model=model_name,
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Anthropic python client returns a Message object
        text = "".join(block.text for block in response.content if block.type == "text").strip()
        return text or fallback_recommendation(risk_level, issues)
    except Exception as e:
        logger.warning(f"Anthropic API error, using fallback recommendation: {str(e)}")
        return fallback_recommendation(risk_level, issues)
