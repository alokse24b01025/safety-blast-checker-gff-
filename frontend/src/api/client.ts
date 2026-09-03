const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = { 
    'Content-Type': 'application/json' 
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) {
        detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      }
    } catch (_) {
      // ignore JSON parse failures for non-JSON error pages
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function registerUser(payload: any) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function verifyRegistration(payload: any) {
  const res = await fetch(`${API_BASE}/api/auth/verify-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('user_role', data.user.role);
  localStorage.setItem('user_fullname', data.user.full_name);
  return data;
}

export async function requestLoginOTP(payload: any) {
  const res = await fetch(`${API_BASE}/api/auth/login-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function verifyLogin(payload: any) {
  const res = await fetch(`${API_BASE}/api/auth/verify-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('user_role', data.user.role);
  localStorage.setItem('user_fullname', data.user.full_name);
  return data;
}

export async function requestForgotPasswordOTP(payload: any) {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function resetPassword(payload: any) {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function loginWithPassword(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse(res);
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('user_role', data.user.role);
  localStorage.setItem('user_fullname', data.user.full_name);
  return data;
}

export async function logoutUser() {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
  } catch (e) {
    console.error(e);
  }
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_fullname');
}

export async function submitChecklist(payload: any) {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function fetchSubmission(id: string) {
  const res = await fetch(`${API_BASE}/api/submissions/${id}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function submitOfficerReview(id: string, review: any) {
  const res = await fetch(`${API_BASE}/api/submissions/${id}/review`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(review),
  });
  return handleResponse(res);
}

export function pdfDownloadUrl(submissionId: string): string {
  return `${API_BASE}/api/submissions/${submissionId}/pdf`;
}

export async function scanSiteVision(imageBase64: string) {
  const res = await fetch(`${API_BASE}/api/submissions/scan-site`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ image_base64: imageBase64 }),
  });
  return handleResponse(res);
}

// --- Module 2: Blast Design Optimisation APIs ---
export async function submitBlastPlan(payload: any) {
  const res = await fetch(`${API_BASE}/api/blast-plan/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function fetchBlastPlans() {
  const res = await fetch(`${API_BASE}/api/blast-plan/list`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function fetchBlastPlan(blastId: string) {
  const res = await fetch(`${API_BASE}/api/blast-plan/${blastId}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function optimizeBlastParams(params: any) {
  const res = await fetch(`${API_BASE}/api/blast-plan/optimise`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
  return handleResponse(res);
}

// --- Incident APIs ---
export async function submitIncidentLog(payload: any) {
  const res = await fetch(`${API_BASE}/api/incidents`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function fetchIncidents() {
  const res = await fetch(`${API_BASE}/api/incidents/list`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function fetchIncidentsByBlast(blastId: string) {
  const res = await fetch(`${API_BASE}/api/incidents/${blastId}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}

// --- Executive Dashboard API ---
export async function fetchDashboardSummary() {
  const res = await fetch(`${API_BASE}/api/dashboard/summary`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}