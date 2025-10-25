/**
 * Type definitions for API responses and requests
 */

// ============================================================
// Response Structure
// ============================================================

export interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

// ============================================================
// Predict Endpoint Types
// ============================================================

export interface PredictRequest {
  text: string;
  model?: "kanana" | "all"; // default: "all" (ensemble)
}

export interface ModelScore {
  model_name: string;
  ai_score: number;
  confidence: number;
  processing_time_ms: number;
}

export interface SentenceAnalysis {
  sentence: string;
  ai_probability: number;
  words: {
    word: string;
    probability: number;
  }[];
}

export interface PredictResponse {
  text: string;
  ai_score: number; // 0-100
  confidence: number; // 0-1
  label: "AI_GENERATED" | "HUMAN_WRITTEN";
  model_scores: ModelScore[];
  sentences_analyzed: number;
  processing_time_ms: number;
}

// ============================================================
// Analyze Endpoint Types
// ============================================================

export interface AnalyzeRequest {
  text: string;
  model?: string;
}

export interface AnalyzeResponse {
  text: string;
  ai_score: number;
  confidence: number;
  label: "AI_GENERATED" | "HUMAN_WRITTEN";
  sentence_analysis: SentenceAnalysis[];
  model_scores: ModelScore[];
  sentences_analyzed: number;
  processing_time_ms: number;
}

// ============================================================
// Batch Upload Types
// ============================================================

export interface BatchUploadResponse {
  batch_id: string;
  status: "PROCESSING" | "PENDING";
  file_count: number;
  estimated_time_seconds: number;
  status_url: string;
}

// ============================================================
// Batch Status Types
// ============================================================

export interface FileResultData {
  filename: string;
  ai_score: number;
  confidence: number;
  label: "AI_GENERATED" | "HUMAN_WRITTEN" | "ERROR";
  sentences_analyzed: number;
  processing_time_ms: number;
  timestamp: string;
  error?: string;
}

export interface BatchProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface BatchSummary {
  total_files: number;
  ai_files: number;
  human_files: number;
  average_score: number;
  total_time_ms: number;
}

export interface BatchStatusResponse {
  batch_id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress?: BatchProgress;
  summary?: BatchSummary;
  results?: FileResultData[];
  error_message?: string;
  started_at?: string;
}

// ============================================================
// Health Check Types
// ============================================================

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  uptime_seconds: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
  memory_usage_mb: number;
  gpu_memory_mb: number;
  timestamp: string;
}

// ============================================================
// Model Status Types
// ============================================================

export interface ModelInfo {
  name: string;
  loaded: boolean;
  load_time_seconds?: number;
  status?: "loaded" | "loading" | "error";
  device?: string;
  parameters?: number;
  quantization?: "8-bit" | "none";
  load_time_ms?: number;
  memory_mb?: number;
}

export interface ModelStatusResponse {
  models: ModelInfo[];
  total_memory_mb: number;
  inference_available: boolean;
  batch_available: boolean;
}

// ============================================================
// Error Types
// ============================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}
