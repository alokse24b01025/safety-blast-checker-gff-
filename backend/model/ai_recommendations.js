import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const MODEL_NAME = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const DISCLAIMER = (
  'This is an AI-generated recommendation only. Final approval for this ' +
  'blast must come from an authorised blasting officer in accordance ' +
  'with site safety standards and applicable law.'
);

function fallbackRecommendation(riskLevel, issues) {
  if (!issues || issues.length === 0) {
    return (
      `Risk level: ${riskLevel}. All checked safety parameters are within ` +
      `acceptable limits. No corrective action identified by the rule engine. ` +
      `${DISCLAIMER}`
    );
  }

  const sortedIssues = [...issues].sort((a, b) => b.weight - a.weight);
  const lines = [`Risk level: ${riskLevel}. The following issues require attention before proceeding:`];
  
  for (const issue of sortedIssues) {
    const tag = issue.critical ? '[CRITICAL] ' : '';
    lines.push(`- ${tag}${issue.description} (Suggested action: resolve before re-submission.)`);
  }
  
  lines.push(DISCLAIMER);
  return lines.join('\n');
}

export async function generateRecommendation(riskLevel, totalScore, issues) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.info('ANTHROPIC_API_KEY not set; using fallback templated recommendation.');
    return fallbackRecommendation(riskLevel, issues);
  }

  const issueLines = issues
    .map(i => `- ${i.critical ? '[CRITICAL] ' : ''}${i.description} (weight: ${i.weight})`)
    .join('\n') || 'No issues flagged.';

  const prompt = `You are a mine blasting safety assistant. A deterministic rule engine
(not you) has already classified this pre-blast checklist submission.
Rule engine output:
- Risk level: ${riskLevel}
- Total risk score: ${totalScore}
- Flagged issues:
${issueLines}

Write a short, clear, professional recommendation (max 150 words) for the
blast site supervisor explaining what needs to be corrected before the
authorised blasting officer can review this submission. Be specific and
actionable. Do not invent additional issues beyond what is listed. Do not
state or imply that you are approving or denying the blast -- only the
authorised blasting officer can do that. End with one sentence reminding
the reader that this is an AI-generated recommendation and final approval
rests with the authorised blasting officer.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();

    return text || fallbackRecommendation(riskLevel, issues);
  } catch (error) {
    console.warn('Anthropic API error, using fallback recommendation:', error.message);
    return fallbackRecommendation(riskLevel, issues);
  }
}
