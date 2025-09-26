// Core types mirrored from backend pydantic models
export interface FileIn { path: string; content: string; }
export interface AssertionFinding {
  rule_id: string; severity: string; path: string; message: string; values: string[]; remediation?: string; file?: string; line?: number; snippet?: string;
}
export interface OptimizedFile { path: string; content: string; }
export interface ValidateReq { files: FileIn[]; rules?: any[]; optimize?: boolean; }
export interface ValidateResp { ok: boolean; findings: AssertionFinding[]; optimized: OptimizedFile[]; }
export interface SuggestionOut { file: string; title: string; rationale: string; diff: string; confidence: number; }
export interface SuggestResp { suggestions: SuggestionOut[]; }
export interface PolicyMeta { group: string; file: string; rules: number; }
export interface PolicyListResp { policies: PolicyMeta[]; }
export interface PolicyFileResp { group: string; file: string; content: string; }

export type Severity = 'critical' | 'high' | 'medium' | 'low' | string;
