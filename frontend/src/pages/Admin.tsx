import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  TrendingUp,
  Server,
  Layers
} from 'lucide-react';
import { modelApi } from '../api/modelApi';
import { ModelVersion, RetrainResponse } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';

export const Admin: React.FC = () => {
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Retrain flow state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await modelApi.getVersions();
      setVersions(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load model versions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  // Poll retrain job if running
  useEffect(() => {
    let timer: any;
    if (isRetraining && currentJobId) {
      timer = setInterval(async () => {
        try {
          const statusRes = await modelApi.getJobStatus(currentJobId);
          setJobStatus(statusRes.status);
          if (statusRes.status === 'COMPLETED') {
            setIsRetraining(false);
            setCurrentJobId(null);
            setToastMessage('Model retraining completed successfully! New version activated.');
            fetchVersions();
            setTimeout(() => setToastMessage(null), 5000);
          } else if (statusRes.status === 'FAILED') {
            setIsRetraining(false);
            setCurrentJobId(null);
            alert('Model retraining failed: ' + (statusRes.error || 'Unknown error'));
          }
        } catch (e) {
          console.error('Failed to poll status', e);
        }
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [isRetraining, currentJobId]);

  const handleTriggerRetrain = async () => {
    setDialogOpen(false);
    setIsRetraining(true);
    setJobStatus('STARTING');
    try {
      const resp: RetrainResponse = await modelApi.triggerRetrain();
      setCurrentJobId(resp.jobId);
      setJobStatus(resp.status);
    } catch (err: any) {
      setIsRetraining(false);
      alert('Unable to start retraining: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchVersions} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Distinct "Administration" Header Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border border-slate-700/50 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200">
                  Control Room
                </span>
                <h1 className="text-xl font-bold tracking-tight">Model Lifecycle Management</h1>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Trigger offline training pipelines, inspect PR-AUC curves, and verify production versions
              </p>
            </div>
          </div>

          <button
            onClick={() => setDialogOpen(true)}
            disabled={isRetraining}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm flex-shrink-0"
          >
            {isRetraining ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Training in progress ({jobStatus})...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Trigger Model Retrain</span>
              </>
            )}
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Model Version History Table */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">Model Version Registry</h2>
            <p className="text-xs text-muted mt-0.5">
              Historical XGBoost model artifacts and evaluation metrics (PR-AUC, Precision, Recall)
            </p>
          </div>
          <button
            onClick={fetchVersions}
            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Refresh versions"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50/75 dark:bg-slate-900/50 text-muted font-medium">
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Trained Date</th>
                <th className="py-3 px-4 font-mono">PR-AUC (Primary)</th>
                <th className="py-3 px-4">Performance Sparkline</th>
                <th className="py-3 px-4 font-mono">Precision @ Thresh</th>
                <th className="py-3 px-4 font-mono">Recall @ Thresh</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {versions.map((ver) => {
                const prPercent = Math.min(100, Math.round(ver.prAuc * 100));

                return (
                  <tr
                    key={ver.version}
                    className={`transition-colors ${
                      ver.isActive
                        ? 'bg-primary/5 dark:bg-primary/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-text flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-primary" />
                      {ver.version}
                    </td>
                    <td className="py-3.5 px-4 text-muted text-[11px] font-mono">
                      {new Date(ver.trainedAt).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-text">
                      {ver.prAuc.toFixed(4)}
                    </td>
                    {/* Visual PR-AUC sparkline bar */}
                    <td className="py-3.5 px-4">
                      <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${prPercent}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted">
                      {(ver.precision * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted">
                      {(ver.recall * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {ver.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active Production
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-muted bg-slate-100 dark:bg-slate-800">
                          Archived
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trigger Retrain Confirmation Dialog */}
      <ConfirmDialog
        isOpen={dialogOpen}
        title="Trigger Model Retraining Pipeline"
        message="This will initiate an offline training job using the latest transaction dataset and leakage-free temporal feature engineering. A new XGBoost model and SHAP TreeExplainer will be fitted and evaluated. Proceed?"
        confirmLabel="Start Retrain"
        cancelLabel="Cancel"
        onConfirm={handleTriggerRetrain}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
};
