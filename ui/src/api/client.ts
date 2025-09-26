import { ValidateReq, ValidateResp, SuggestResp, PolicyListResp, PolicyFileResp } from '../types';

// Prefer 8000 (common local alt) then 8080 fallback if user sets VITE_API_BASE
const DEFAULT_BASE = 'http://127.0.0.1:8000';
export const API_BASE = (import.meta as any).env?.VITE_API_BASE || DEFAULT_BASE;

async function json<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API ${resp.status}: ${text}`);
  }
  return resp.json();
}

export async function listPolicies(): Promise<PolicyListResp> {
  return json(await fetch(`${API_BASE}/v1/policies`));
}

export async function fetchPolicy(group: string, file: string): Promise<PolicyFileResp> {
  return json(await fetch(`${API_BASE}/v1/policies/${encodeURIComponent(group)}/${encodeURIComponent(file)}`));
}

export async function validate(req: ValidateReq): Promise<ValidateResp> {
  return json(await fetch(`${API_BASE}/v1/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }));
}

export async function suggest(req: ValidateReq): Promise<SuggestResp> {
  return json(await fetch(`${API_BASE}/v1/suggest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }));
}
