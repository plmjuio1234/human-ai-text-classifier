/**
 * API client for backend service
 * Handles all HTTP requests to the backend server
 */

import axios, { AxiosError } from "axios";
import type { AxiosInstance } from "axios";
import type {
  ApiResponse,
  PredictRequest,
  PredictResponse,
  AnalyzeRequest,
  AnalyzeResponse,
  BatchUploadResponse,
  BatchStatusResponse,
  ModelStatusResponse,
  ApiError,
} from "./types";

// ============================================================
// API Client Configuration
// ============================================================

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = "http://localhost:8000") {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30 second timeout
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error("API Error:", error.message);
        if (error.response?.data) {
          return Promise.reject(error.response.data);
        }
        return Promise.reject({
          status: "error",
          error: {
            code: "NETWORK_ERROR",
            message: error.message || "Network error occurred",
            details: {},
          },
          timestamp: new Date().toISOString(),
        });
      }
    );
  }

  // ============================================================
  // Health & Status Endpoints
  // ============================================================

  /**
   * Check if backend server is healthy
   */
  async getHealth(): Promise<{ status: string }> {
    try {
      const response = await this.client.get("/health");
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get model status and memory information
   */
  async getModelStatus(): Promise<ModelStatusResponse> {
    try {
      const response = await this.client.get<
        ApiResponse<ModelStatusResponse>
      >("/api/models/status");

      if (response.data.status === "error") {
        throw response.data.error;
      }

      return response.data.data!;
    } catch (error) {
      throw error;
    }
  }

  // ============================================================
  // Prediction Endpoints
  // ============================================================

  /**
   * Predict if text is AI-generated or human-written
   * Uses ensemble of all 3 models by default
   */
  async predict(request: PredictRequest): Promise<PredictResponse> {
    try {
      const response = await this.client.post<ApiResponse<PredictResponse>>(
        "/api/predict",
        {
          text: request.text,
          model: request.model || "kanana", // default to kanana model
        }
      );

      if (response.data.status === "error") {
        throw response.data.error;
      }

      return response.data.data!;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Analyze text with sentence-level detailed analysis
   * Returns AI probability for each sentence and word
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    try {
      const response = await this.client.post<ApiResponse<AnalyzeResponse>>(
        "/api/analyze",
        {
          text: request.text,
          model: request.model || "kanana",
        }
      );

      if (response.data.status === "error") {
        throw response.data.error;
      }

      return response.data.data!;
    } catch (error) {
      throw error;
    }
  }

  // ============================================================
  // Batch Processing Endpoints
  // ============================================================

  /**
   * Upload multiple files for batch analysis
   * Returns batch_id for polling status
   */
  async uploadBatch(files: File[]): Promise<BatchUploadResponse> {
    try {
      const formData = new FormData();

      // Add all files to form data
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await this.client.post<
        ApiResponse<BatchUploadResponse>
      >("/api/batch/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 1 minute for file upload
      });

      if (response.data.status === "error") {
        throw response.data.error;
      }

      return response.data.data!;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get batch processing status
   * Polls current progress and results (if completed)
   */
  async getBatchStatus(batchId: string): Promise<BatchStatusResponse> {
    try {
      const response = await this.client.get<ApiResponse<BatchStatusResponse>>(
        `/api/batch/${batchId}`
      );

      if (response.data.status === "error") {
        throw response.data.error;
      }

      return response.data.data!;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Download batch results as CSV or Excel
   * Only available after batch is completed
   */
  async downloadBatchResults(
    batchId: string,
    format: "csv" | "xlsx" = "csv"
  ): Promise<Blob> {
    try {
      const response = await this.client.get(`/api/batch/${batchId}/download`, {
        params: { format },
        responseType: "blob",
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Validate file before upload
   * Check file size and type
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSizeMB = 50;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const supportedFormats = [".txt", ".pdf", ".docx"];

    // Check file size
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit`,
      };
    }

    // Check file format
    const fileName = file.name.toLowerCase();
    const hasValidExtension = supportedFormats.some((fmt) =>
      fileName.endsWith(fmt)
    );

    if (!hasValidExtension) {
      return {
        valid: false,
        error: `Unsupported file format. Supported: ${supportedFormats.join(", ")}`,
      };
    }

    return { valid: true };
  }

  /**
   * Download file utility
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Check if server is reachable
   */
  async isServerAvailable(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================
// Export Singleton Instance
// ============================================================

const apiClient = new ApiClient();
export default apiClient;

// Export types for convenience
export type { ApiResponse, ApiError };
