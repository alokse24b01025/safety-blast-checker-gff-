const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
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
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function loginUser(credentials: any) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const data = await handleResponse(res);
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('user_role', data.role);
  localStorage.setItem('user_fullname', data.full_name);
  return data;
}

export function logoutUser() {
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

export function pdfDownloadUrl(id: string): string {
  return `${API_BASE}/api/submissions/${id}/pdf`;
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
