import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface PredictRequest {
  text: string;
}

export interface PredictResponse {
  text: string;
  ai_probability: number;
  prediction: string;
  confidence: string;
  char_count: number;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  gpu_available: boolean;
}

export interface SentenceAnalysis {
  text: string;
  ai_probability: number;
}

export interface OverallAnalysis {
  full_text_probability: number;
  prediction: string;
  confidence: string;
}

export interface SentenceAnalysisResponse {
  overall_analysis: OverallAnalysis;
  paragraph_analysis: SentenceAnalysis[];
  paragraph_average: number;
}

export const predictText = async (text: string): Promise<PredictResponse> => {
  const response = await axios.post<PredictResponse>(
    `${API_BASE_URL}/api/predict`,
    { text }
  );
  return response.data;
};

export const analyzeSentences = async (text: string): Promise<SentenceAnalysisResponse> => {
  const response = await axios.post<SentenceAnalysisResponse>(
    `${API_BASE_URL}/api/analyze-sentences`,
    { text }
  );
  return response.data;
};

export const checkHealth = async (): Promise<HealthResponse> => {
  const response = await axios.get<HealthResponse>(`${API_BASE_URL}/api/health`);
  return response.data;
};
