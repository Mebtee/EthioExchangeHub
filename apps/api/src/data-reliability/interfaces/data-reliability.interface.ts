import type { Currency } from '@prisma/client';

// ── Validation Interfaces ─────────────────────────────────────
export type RuleSeverity = 'WARNING' | 'FAIL';
export type RuleStatus = 'PASS' | 'WARNING' | 'FAIL';

export interface RuleResult {
  ruleName: string;
  ruleId: string;
  status: RuleStatus;
  currencyTo?: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationConfig {
  maxSpread: number;
  maxChangePercent: number;
  maxNbeDeviationPercent: number;
  requiredCurrencies: Currency[];
}

// ── Confidence Scoring ────────────────────────────────────────
export interface ConfidenceBreakdown {
  parserCorrect: number;       // 25
  htmlStructureUnchanged: number; // 15
  screenshotCaptured: number;  // 15
  previousDayComparison: number; // 10
  requiredCurrenciesPresent: number; // 10
  spreadValidation: number;    // 10
  nbeComparison: number;       // 10
  manualApproval: number;      // 5
  stableScraperHistory: number; // 10
}

export interface ConfidenceResult {
  score: number;
  breakdown: ConfidenceBreakdown;
}

// ── Anomaly Detection ─────────────────────────────────────────
export type AnomalyType =
  | 'SPIKE'
  | 'ABNORMAL_SPREAD'
  | 'DUPLICATE'
  | 'REPEATED_DATA'
  | 'IMPOSSIBLE_VALUE'
  | 'PARSER_FAILURE'
  | 'HTML_CHANGE'
  | 'MISSING_CURRENCY'
  | 'HTTP_REDIRECT'
  | 'CLOUDFLARE_BLOCK'
  | 'CAPTCHA';

export interface AnomalyResult {
  type: AnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  details?: Record<string, unknown>;
}

// ── Approval Interfaces ───────────────────────────────────────
export type ApprovalStatusType = 'PENDING' | 'VALIDATED' | 'APPROVED' | 'REJECTED' | 'ESTIMATED';

// ── HTML Change Detection ─────────────────────────────────────
export interface HtmlChangeResult {
  hasChanges: boolean;
  addedColumns: string[];
  removedColumns: string[];
  movedTables: string[];
  changedSelectors: string[];
  diffScore: number; // 0-100
  shouldDisableAutoPublish: boolean;
}

// ── Scraper Health ────────────────────────────────────────────
export interface ScraperHealthSummary {
  bankId: string;
  bankName: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  lastSuccessfulScrape: string | null;
  lastFailedScrape: string | null;
  successRate7d: number;
  successRate30d: number;
  successRate90d: number;
  averageScrapeDurationMs: number;
  consecutiveFailures: number;
  retryCount: number;
  averageConfidenceScore: number;
  validationFailureRate: number;
}

// ── Notification Interfaces ───────────────────────────────────
export interface ReliabilityNotification {
  type: 'SCRAPE_FAILURE' | 'PARSER_FAILURE' | 'LOW_CONFIDENCE' | 'HTML_CHANGED' | 'NO_DATA_BY_0900' | 'DUPLICATE_DATA' | 'MISSING_CURRENCIES' | 'VALIDATION_FAILURE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  bankName: string;
  message: string;
  details?: Record<string, unknown>;
}

// ── Pipeline Interfaces ───────────────────────────────────────
export interface DataPipelineResult {
  rawScrapeDataId: string;
  validationRunId: string | null;
  confidenceScoreId: string | null;
  approvalId: string | null;
  exchangeRateId: string | null;
  anomalies: AnomalyResult[];
  overallStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  errors: string[];
}
