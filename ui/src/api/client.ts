import { ValidateReq, ValidateResp, SuggestResp, PolicyListResp, PolicyFileResp } from '../types';

// Production-ready API base detection
const DEFAULT_BASE = 'http://127.0.0.1:8000';
export const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 
                        (import.meta as any).env?.VITE_API_BASE ?? 
                        window.location.origin;

console.info('[yaml-guard] API_BASE =', API_BASE);

async function json<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) { lastErr = e; if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs)); }
  }
  throw lastErr;
}

export async function listPolicies(): Promise<PolicyListResp> {
  return withRetry(async () => json(await fetch(`${API_BASE}/v1/policies`)));
}

export async function fetchPolicy(group: string, file: string): Promise<PolicyFileResp> {
  return json(
    await fetch(
      `${API_BASE}/v1/policies/${encodeURIComponent(group)}/${encodeURIComponent(file)}`
    )
  );
}

export async function validate(req: ValidateReq): Promise<ValidateResp> {
  return json(await fetch(`${API_BASE}/v1/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }));
}

export async function suggest(req: ValidateReq): Promise<SuggestResp> {
  return json(await fetch(`${API_BASE}/v1/suggest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }));
}
