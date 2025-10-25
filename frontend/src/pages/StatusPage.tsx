/**
 * Status Page
 * System status monitoring and health checks
 * Real-time backend health, model status, and performance metrics
 */

import { useEffect, useState } from 'react';
import apiClient from '../services/api';
import type { ModelStatusResponse } from '../services/types';
import { Card } from '../components/ui/card';

export default function StatusPage() {
  const [health, setHealth] = useState<any>(null);
  const [models, setModels] = useState<ModelStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch health and model status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        const [healthData, modelsData] = await Promise.all([
          apiClient.getHealth(),
          apiClient.getModelStatus(),
        ]);

        setHealth(healthData);
        setModels(modelsData);
        setLastUpdate(new Date());
      } catch (err) {
        const message = err instanceof Error ? err.message : '상태 조회 실패';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container-main">
      {/* Header with Gradient */}
      <div className="mb-12 animate-fade-in">
        <div className="inline-block mb-4 px-4 py-2 bg-sky-100 text-sky-700 rounded-full text-sm font-semibold">
          📊 Real-time Monitoring
        </div>
        <h1 className="text-5xl font-black mb-4 text-slate-900 tracking-tight">
          시스템 상태
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
          백엔드 헬스, 모델 상태, 시스템 리소스를 실시간으로 모니터링합니다.
          <br />
          <span className="text-sm mt-3 inline-block">마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}</span>
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-8 animate-fade-in">
          <Card className="card-body bg-red-50 border-red-200">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🚨</div>
              <div>
                <h3 className="font-bold text-red-700">상태 조회 오류</h3>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {loading && !health && (
        <div className="animate-fade-in">
          <Card className="card-body text-center py-16">
            <div className="text-6xl mb-4 animate-spin inline-block">⟳</div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">상태 정보 로드 중</h3>
            <p className="text-slate-600">실시간 데이터를 수집하고 있습니다</p>
          </Card>
        </div>
      )}

      {health && models && (
        <div className="space-y-8 animate-fade-in">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Backend Health */}
            <Card className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700">백엔드 상태</h3>
                <span className="text-2xl">🖥️</span>
              </div>
              <div className={`p-4 rounded-xl ${
                health?.status === 'healthy'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-amber-50 border border-amber-200'
              }`}>
                <p className={`text-2xl font-black ${
                  health?.status === 'healthy' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {health?.status === 'healthy' ? '✅ 정상' : '⚠️ 주의'}
                </p>
              </div>
            </Card>

            {/* Backend Connection */}
            <Card className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700">백엔드 연결</h3>
                <span className="text-2xl">🔗</span>
              </div>
              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <p className="text-2xl font-black text-green-600">✅ 연결됨</p>
              </div>
            </Card>

            {/* Current Time */}
            <Card className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700">현재 시간</h3>
                <span className="text-2xl">🕐</span>
              </div>
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200">
                <p className="text-lg font-bold text-sky-600">{new Date().toLocaleTimeString('ko-KR')}</p>
              </div>
            </Card>
          </div>

          {/* Models Status */}
          <div>
            <div className="section-title mb-6">모델 상태</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {models.models.map((model) => (
                <Card key={model.name} className={`card-body ${
                  model.loaded ? 'border-green-200' : 'border-red-200'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 capitalize">{model.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">{model.parameters && `${(model.parameters / 1e9).toFixed(1)}B`}</p>
                    </div>
                    <span className="text-2xl">{model.loaded ? '✅' : '❌'}</span>
                  </div>

                  <div className={`p-3 rounded-lg mb-3 ${
                    model.loaded
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`font-bold ${
                      model.loaded ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {model.loaded ? '로드됨' : '로드 안됨'}
                    </p>
                  </div>

                  {model.memory_mb && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">메모리:</span>
                        <span className="font-semibold text-slate-900">{(model.memory_mb / 1024).toFixed(1)} GB</span>
                      </div>
                      {model.device && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">디바이스:</span>
                          <span className="font-semibold text-slate-900">{model.device}</span>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* System Metrics */}
          <div>
            <div className="section-title mb-6">시스템 정보</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Loaded Models */}
              <Card className="card-body text-center">
                <div className="text-4xl mb-3">🤖</div>
                <p className="text-slate-600 text-sm font-medium mb-2">로드된 모델</p>
                <div className="flex items-baseline justify-center gap-2">
                  <p className="text-4xl font-black text-sky-600">
                    {models.models.filter(m => m.loaded).length}
                  </p>
                  <p className="text-xl text-slate-400">/ {models.models.length}</p>
                </div>
                <div className="progress-bar mt-4">
                  <div
                    className="progress-fill"
                    style={{ width: `${(models.models.filter(m => m.loaded).length / models.models.length) * 100}%` }}
                  />
                </div>
              </Card>

              {/* Total Memory */}
              <Card className="card-body text-center">
                <div className="text-4xl mb-3">💾</div>
                <p className="text-slate-600 text-sm font-medium mb-2">전체 메모리</p>
                <p className="text-4xl font-black text-green-600">
                  {(models.total_memory_mb / 1024).toFixed(1)}
                </p>
                <p className="text-slate-600 text-sm mt-1">GB</p>
              </Card>

              {/* Inference Available */}
              <Card className="card-body text-center">
                <div className="text-4xl mb-3">⚡</div>
                <p className="text-slate-600 text-sm font-medium mb-2">추론 가능 여부</p>
                <p className={`text-3xl font-black mt-2 ${
                  models.inference_available ? 'text-green-600' : 'text-red-600'
                }`}>
                  {models.inference_available ? '✅' : '❌'}
                </p>
                <p className={`text-sm mt-2 font-medium ${
                  models.inference_available ? 'text-green-600' : 'text-red-600'
                }`}>
                  {models.inference_available ? '가능' : '불가'}
                </p>
              </Card>
            </div>
          </div>

          {/* Auto Refresh Notice */}
          <Card className="card-body bg-sky-50 border-sky-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <h4 className="font-semibold text-sky-900">자동 새로고침</h4>
                <p className="text-sky-700 text-sm mt-1">이 페이지는 10초마다 자동으로 상태 정보를 업데이트합니다</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
