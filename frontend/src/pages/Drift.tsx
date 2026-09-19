import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  SlidersHorizontal,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { driftApi } from '../api/driftApi';
import { DriftMetric } from '../types';
import { ChartSkeleton, CardSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';

export const Drift: React.FC = () => {
  const [metrics, setMetrics] = useState<DriftMetric[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<string>('amountLog');
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrift = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await driftApi.getMetrics();
      setMetrics(data);
      // If selected feature is not in list, select first available
      if (data.length > 0 && !data.some((m) => m.featureName === selectedFeature)) {
        setSelectedFeature(data[0].featureName);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load drift metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleComputeNow = async () => {
    setComputing(true);
    try {
      const updated = await driftApi.computeDrift();
      setMetrics(updated);
    } catch (err: any) {
      alert('Failed to compute drift: ' + (err.response?.data?.message || err.message));
    } finally {
      setComputing(false);
    }
  };

  useEffect(() => {
    fetchDrift();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-48 animate-pulse" />
        <ChartSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDrift} />;
  }

  // Get distinct features
  const featureNames = Array.from(new Set(metrics.map((m) => m.featureName)));

  // Filter metrics for selected feature chart
  const chartData = metrics
    .filter((m) => m.featureName === selectedFeature)
    .sort((a, b) => new Date(a.windowStart).getTime() - new Date(b.windowStart).getTime())
    .map((m) => ({
      date: new Date(m.windowEnd).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      psi: m.driftScore,
      breached: m.thresholdBreached,
      fullDate: `${new Date(m.windowStart).toLocaleDateString()} - ${new Date(m.windowEnd).toLocaleDateString()}`,
    }));

  // Summary table of latest PSI per feature, sorted worst-first
  const latestByFeature: Record<string, DriftMetric> = {};
  metrics.forEach((m) => {
    if (!latestByFeature[m.featureName] || new Date(m.windowEnd) > new Date(latestByFeature[m.featureName].windowEnd)) {
      latestByFeature[m.featureName] = m;
    }
  });

  const summaryList = Object.values(latestByFeature).sort((a, b) => b.driftScore - a.driftScore);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Data Drift Monitoring</h1>
          <p className="text-xs text-muted mt-1">
            Population Stability Index (PSI) tracking against offline training baselines
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleComputeNow}
            disabled={computing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 ${computing ? 'animate-spin' : ''}`} />
            <span>{computing ? 'Computing PSI...' : 'Run Drift Analysis'}</span>
          </button>
          <button
            onClick={fetchDrift}
            className="p-2 text-muted hover:text-text bg-surface border border-border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feature Selector Tabs */}
      <div className="bg-surface rounded-xl p-3 border border-border shadow-sm flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-medium text-muted px-2 flex items-center gap-1.5 flex-shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Feature:
        </span>
        {featureNames.map((name) => {
          const isSelected = name === selectedFeature;
          const isBreached = latestByFeature[name]?.thresholdBreached;

          return (
            <button
              key={name}
              onClick={() => setSelectedFeature(name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 flex-shrink-0 ${
                isSelected
                  ? 'bg-primary text-white shadow-sm font-semibold'
                  : 'bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-muted border border-border'
              }`}
            >
              <span>{name}</span>
              {isBreached && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main PSI Trend Line Chart */}
      <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h2 className="text-base font-semibold text-text flex items-center gap-2">
              <span className="font-mono text-primary">{selectedFeature}</span> PSI Trend
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Horizontal dashed line marks industry breach threshold (PSI = 0.20)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Observed PSI
            </span>
            <span className="flex items-center gap-1.5 text-red-500 font-medium">
              <span className="w-3 h-0.5 bg-red-500" /> 0.20 Threshold
            </span>
          </div>
        </div>

        <div className="w-full h-72">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted">
              No historical drift points for this feature.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                <XAxis dataKey="date" stroke="var(--muted)" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="var(--muted)"
                  fontSize={12}
                  tickLine={false}
                  domain={[0, (dataMax: number) => Math.max(0.3, Math.ceil(dataMax * 10) / 10)]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: any) => [`${value} (PSI)`, 'Drift Score']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                />
                <ReferenceLine
                  y={0.20}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{ value: 'Breach Limit (0.20)', fill: '#EF4444', fontSize: 11, position: 'top' }}
                />
                <Line
                  type="monotone"
                  dataKey="psi"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#3B82F6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Feature Drift Overview Table (Worst First) */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-base font-semibold text-text">Feature Stability Summary</h3>
          <p className="text-xs text-muted mt-0.5">All monitored features sorted worst-first by latest PSI score</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50/75 dark:bg-slate-900/50 text-muted font-medium">
                <th className="py-3 px-4">Feature Name</th>
                <th className="py-3 px-4">Evaluation Window</th>
                <th className="py-3 px-4">Latest PSI Score</th>
                <th className="py-3 px-4">Drift Classification</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summaryList.map((item) => {
                const isBreached = item.thresholdBreached || item.driftScore > 0.20;
                const isModerate = item.driftScore >= 0.10 && !isBreached;

                return (
                  <tr
                    key={item.featureName}
                    onClick={() => setSelectedFeature(item.featureName)}
                    className={`cursor-pointer transition-colors ${
                      isBreached
                        ? 'bg-red-500/5 hover:bg-red-500/10 dark:bg-red-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-text">
                      {item.featureName}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted text-[11px]">
                      {new Date(item.windowStart).toLocaleDateString()} - {new Date(item.windowEnd).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-text">
                      {item.driftScore.toFixed(4)}
                    </td>
                    <td className="py-3 px-4">
                      {isBreached ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Significant Drift (Action Required)
                        </span>
                      ) : isModerate ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Moderate Drift (Monitor)
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Stable Distribution
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isBreached ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20">
                          <AlertTriangle className="w-3 h-3" /> Breach
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Healthy
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
    </div>
  );
};
