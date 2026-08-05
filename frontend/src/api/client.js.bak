const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function handleResponse(res) {
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) {
        detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      }
    } catch (_) {
      // ignore parse errors, use default message
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function submitChecklist(payload) {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/api/submissions`);
  return handleResponse(res);
}

export async function fetchSubmission(id) {
  const res = await fetch(`${API_BASE}/api/submissions/${id}`);
  return handleResponse(res);
}

export async function submitOfficerReview(id, review) {
  const res = await fetch(`${API_BASE}/api/submissions/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  });
  return handleResponse(res);
}

export function pdfDownloadUrl(id) {
  return `${API_BASE}/api/submissions/${id}/pdf`;
}
