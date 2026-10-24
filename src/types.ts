
export type RiskLevel = "critical" | "high" | "medium" | "low";

export type Prediction = "safe" | "vulnerable";

export type Theme = "dark" | "light";

export interface Vulnerability {
  line: number;
  content: string;
  vulnerabilityType: string;
  severity: RiskLevel;
  description: string;
  suggestion: string;
}

export interface AIExplanation {
  available: boolean;
  model?: string;
  explanation?: string;
  possible_issues?: string[];
  suggested_fix?: string;
}

export interface ScanResult {
  codeLines: string;
  language: string;
  total_lines: number;
  vulnerabilitiesFound: number;
  overallRisk: "low" | "high";
  prediction: Prediction;
  confidence: number;
  vulnerabilities: Vulnerability[];
  analysis_scope: "whole_snippet" | string;
  message: string;
  ai_explanation?: AIExplanation;
}

export interface ScanRequest {
  code: string;
  language: string;
}

export interface ScanError {
  error: string;
}

export interface HistoryEntry {
  id: number;
  timestamp: string;
  language: string;
  codeLines: number;
  codePreview?: string;
  vulnerabilitiesFound: number;
  overallRisk: "low" | "high";
  prediction: Prediction;
  confidence: number;
  sampleVulnerabilities: Vulnerability[];
}

export interface HistoryResponse {
  history: HistoryEntry[];
}
