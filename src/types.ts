export type Prediction = "safe" | "vulnerable";

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AIExplanation {
  available: boolean;
  model?: string | null;
  explanation?: string;
}

/** Short scan shape used in lists and tables. */
export interface ScanSummary {
  id: number;
  title: string;
  created_at: string;
  language: string;
  total_lines: number;
  prediction: Prediction;
  confidence: number;
  vulnerable_probability: number;
  overall_risk: "low" | "high";
  /** Decision threshold used for this scan (0.5 for scans made before v3). */
  threshold: number;
  model_version: string | null;
  ai_available: boolean;
  code_preview: string;
}

/** Full scan, returned by POST /api/scan and GET /api/scans/:id. */
export interface ScanDetail extends ScanSummary {
  code: string;
  chunk_count: number;
  ai_explanation: AIExplanation;
}

export interface ScanListResponse {
  scans: ScanSummary[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  languages: string[];
}

export interface DailyCount {
  date: string;
  total: number;
  vulnerable: number;
}

export interface LanguageCount {
  language: string;
  total: number;
  vulnerable: number;
}

export interface Stats {
  total_scans: number;
  vulnerable_scans: number;
  safe_scans: number;
  vulnerable_rate: number;
  average_confidence: number;
  total_lines: number;
  by_language: LanguageCount[];
  daily: DailyCount[];
  recent: ScanSummary[];
}
