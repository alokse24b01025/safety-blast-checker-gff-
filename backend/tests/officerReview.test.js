import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import { Submission } from '../model/Submission.js';

describe('Officer Review API Constraints', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/blast_safety_test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    try {
      await mongoose.connection.db.dropDatabase();
    } catch (e) {
      // ignore if db drop fails
    }
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Submission.deleteMany({});
  });

  test('successfully posts a review and locks it (irreversible)', async () => {
    const sub = new Submission({
      site_name: 'Test Site',
      blast_id: 'TEST-100',
      payload: { site_name: 'Test Site', blast_id: 'TEST-100' },
      blast_date: '2026-07-15',
      total_score: 0,
      risk_level: 'GREEN',
      critical_triggered: false,
      issues: []
    });
    await sub.save();

    // First review -> should succeed (200 OK)
    const res1 = await request(app)
      .post(`/api/submissions/${sub.id}/review`)
      .send({
        decision: 'HOLD',
        officer_name: 'Officer Alok',
        comments: 'Check weather again'
      });
    expect(res1.status).toBe(200);
    expect(res1.body.officer_decision).toBe('HOLD');

    // Second review -> should fail with 400 Bad Request
    const res2 = await request(app)
      .post(`/api/submissions/${sub.id}/review`)
      .send({
        decision: 'APPROVED',
        officer_name: 'Officer Alok',
        comments: 'All clear now'
      });
    expect(res2.status).toBe(400);
    expect(res2.body.detail).toContain('already been recorded');
  });

  test('blocks APPROVED decision on a RED risk submission', async () => {
    const sub = new Submission({
      site_name: 'Test Site',
      blast_id: 'TEST-200',
      payload: { site_name: 'Test Site', blast_id: 'TEST-200' },
      blast_date: '2026-07-15',
      total_score: 80,
      risk_level: 'RED',
      critical_triggered: true,
      issues: [{ code: 'LIGHTNING_WARNING', description: 'Lightning warning', weight: 40, critical: true }]
    });
    await sub.save();

    // Try to approve -> should fail with 400 Bad Request
    const res1 = await request(app)
      .post(`/api/submissions/${sub.id}/review`)
      .send({
        decision: 'APPROVED',
        officer_name: 'Officer Alok',
        comments: 'Force approve anyway'
      });
    expect(res1.status).toBe(400);
    expect(res1.body.detail).toContain('Cannot approve');

    // Try to reject -> should succeed (200 OK)
    const res2 = await request(app)
      .post(`/api/submissions/${sub.id}/review`)
      .send({
        decision: 'REJECTED',
        officer_name: 'Officer Alok',
        comments: 'Lightning warning active!'
      });
    expect(res2.status).toBe(200);
    expect(res2.body.officer_decision).toBe('REJECTED');
  });
});
