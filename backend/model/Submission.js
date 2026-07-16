import mongoose from 'mongoose';

const flaggedIssueSchema = new mongoose.Schema({
  code: { type: String, required: true },
  description: { type: String, required: true },
  weight: { type: Number, required: true },
  critical: { type: Boolean, default: false }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  site_name: { type: String, required: true },
  blast_id: { type: String, required: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  blast_date: { type: String, required: true },
  total_score: { type: Number, required: true },
  risk_level: { type: String, required: true, enum: ['GREEN', 'YELLOW', 'ORANGE', 'RED'] },
  critical_triggered: { type: Boolean, required: true },
  issues: [flaggedIssueSchema],
  ai_recommendation: { type: String },
  officer_decision: { type: String, enum: ['APPROVED', 'REJECTED', 'HOLD', null], default: null },
  officer_name: { type: String, default: null },
  officer_comments: { type: String, default: null },
  reviewed_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
});

submissionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.submission_id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

submissionSchema.set('toObject', { virtuals: true });

export const Submission = mongoose.model('Submission', submissionSchema);
