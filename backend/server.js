import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './app/database.js';
import { Submission } from './model/Submission.js';
import { evaluateBlastSite } from './model/rule_engine.js';
import { generateRecommendation } from './model/ai_recommendations.js';
import { buildChecklistPdf } from './app/pdf_generator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// CORS setup
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- Health Check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Helper validation function
function validateChecklistInput(data) {
  const errors = [];

  if (!data.site_name || typeof data.site_name !== 'string' || data.site_name.trim().length < 2) {
    errors.push('site_name must be a string with at least 2 characters');
  }
  if (!data.blast_id || typeof data.blast_id !== 'string' || data.blast_id.trim().length < 1) {
    errors.push('blast_id must be a string with at least 1 character');
  }

  if (data.temperature_c === undefined || typeof data.temperature_c !== 'number' || data.temperature_c < -50 || data.temperature_c > 70) {
    errors.push('temperature_c must be a number between -50 and 70');
  }
  if (data.rainfall_mm === undefined || typeof data.rainfall_mm !== 'number' || data.rainfall_mm < 0 || data.rainfall_mm > 1000) {
    errors.push('rainfall_mm must be a number between 0 and 1000');
  }
  if (data.wind_speed_kmh === undefined || typeof data.wind_speed_kmh !== 'number' || data.wind_speed_kmh < 0 || data.wind_speed_kmh > 300) {
    errors.push('wind_speed_kmh must be a number between 0 and 300');
  }
  if (data.worker_count === undefined || typeof data.worker_count !== 'number' || data.worker_count < 0 || data.worker_count > 5000) {
    errors.push('worker_count must be a number between 0 and 5000');
  }

  if (data.max_safe_worker_count !== undefined && data.max_safe_worker_count !== null) {
    if (typeof data.max_safe_worker_count !== 'number' || data.max_safe_worker_count < 1 || data.max_safe_worker_count > 5000) {
      errors.push('max_safe_worker_count must be a number between 1 and 5000');
    }
  }

  const booleans = [
    'lightning_warning', 'supervisor_available', 'blasting_officer_available',
    'workers_in_exclusion_zone', 'safety_briefing_completed', 'detonators_secure',
    'siren_working', 'communication_working', 'emergency_vehicle_available',
    'exclusion_zone_established', 'barricades_in_place', 'blast_design_approved',
    'escape_route_clear'
  ];
  booleans.forEach(field => {
    if (data[field] === undefined || typeof data[field] !== 'boolean') {
      errors.push(`${field} must be a boolean value`);
    }
  });

  if (!data.blast_date) {
    errors.push('blast_date is required');
  }
  if (!data.blast_time) {
    errors.push('blast_time is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// --- Submit Checklist ---
app.post('/api/submissions', async (req, res) => {
  try {
    const { isValid, errors } = validateChecklistInput(req.body);
    if (!isValid) {
      return res.status(422).json({ detail: errors });
    }

    const payload = req.body;
    const assessment = evaluateBlastSite(payload);
    const aiRecommendation = await generateRecommendation(
      assessment.risk_level,
      assessment.total_score,
      assessment.issues
    );

    const submission = new Submission({
      site_name: payload.site_name,
      blast_id: payload.blast_id,
      payload,
      blast_date: String(payload.blast_date),
      total_score: assessment.total_score,
      risk_level: assessment.risk_level,
      critical_triggered: assessment.critical_triggered,
      issues: assessment.issues,
      ai_recommendation: aiRecommendation
    });

    await submission.save();
    res.status(200).json(submission.toJSON());
  } catch (error) {
    console.error('Failed to process submission:', error);
    res.status(500).json({ detail: `Failed to process submission: ${error.message}` });
  }
});

// --- List Submission History ---
app.get('/api/submissions', async (req, res) => {
  try {
    const submissions = await Submission.find().sort({ created_at: -1 });
    const historyList = submissions.map(sub => {
      const item = sub.toJSON();
      return {
        id: item.id,
        site_name: item.site_name,
        blast_id: item.blast_id,
        blast_date: item.blast_date,
        total_score: item.total_score,
        risk_level: item.risk_level,
        created_at: item.created_at
      };
    });
    res.json(historyList);
  } catch (error) {
    console.error('Failed to list submissions:', error);
    res.status(500).json({ detail: `Failed to list submissions: ${error.message}` });
  }
});

// --- Fetch One Submission Detail ---
app.get('/api/submissions/:id', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ detail: 'Submission not found' });
    }
    res.json(submission.toJSON());
  } catch (error) {
    console.error('Failed to fetch submission:', error);
    res.status(500).json({ detail: `Failed to fetch submission: ${error.message}` });
  }
});

// --- Record Officer Review ---
app.post('/api/submissions/:id/review', async (req, res) => {
  try {
    const { decision, officer_name, comments } = req.body;
    
    if (!decision || !['APPROVED', 'REJECTED', 'HOLD'].includes(decision)) {
      return res.status(400).json({ detail: 'decision must be APPROVED, REJECTED, or HOLD' });
    }
    if (!officer_name || typeof officer_name !== 'string' || officer_name.trim().length < 2) {
      return res.status(400).json({ detail: 'officer_name must be a string with at least 2 characters' });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ detail: 'Submission not found' });
    }

    // Safety rule 1: Enforce irreversibility
    if (submission.officer_decision !== null) {
      return res.status(400).json({ detail: 'Officer decision has already been recorded and is irreversible.' });
    }

    // Safety rule 2: Block APPROVED decisions on RED risk checklists
    if (decision === 'APPROVED' && submission.risk_level === 'RED') {
      return res.status(400).json({ detail: 'Cannot approve a blast checklist evaluated with RED risk level. Safety parameters must be corrected first.' });
    }

    submission.officer_decision = decision;
    submission.officer_name = officer_name;
    submission.officer_comments = comments || null;
    submission.reviewed_at = new Date();

    await submission.save();

    res.json({
      submission_id: submission.id,
      officer_decision: submission.officer_decision,
      officer_name: submission.officer_name,
      officer_comments: submission.officer_comments,
      reviewed_at: submission.reviewed_at.toISOString()
    });
  } catch (error) {
    console.error('Failed to review submission:', error);
    res.status(500).json({ detail: `Failed to review submission: ${error.message}` });
  }
});

// --- Download PDF ---
app.get('/api/submissions/:id/pdf', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ detail: 'Submission not found' });
    }

    const pdfBuffer = await buildChecklistPdf(submission);
    const filename = `blast_checklist_${submission.blast_id}_${submission.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    res.status(500).json({ detail: `Failed to generate PDF: ${error.message}` });
  }
});

// Start DB connection & start server
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  });
}

export default app;
