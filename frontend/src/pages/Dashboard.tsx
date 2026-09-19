import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  AlertTriangle,
  Cpu,
  Percent,
  ArrowUpRight,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { dashboardApi } from '../api/dashboardApi';
import { transactionApi } from '../api/transactionApi';
import { DashboardSummary, Transaction } from '../types';
import { StatCard } from '../components/StatCard';
import { ScoreChart } from '../components/ScoreChart';
import { RiskBadge } from '../components/RiskBadge';
import { CardSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentHighRisk, setRecentHighRisk] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, highRiskData] = await Promise.all([
        dashboardApi.getSummary(),
        transactionApi.getTransactions({ riskTier: 'HIGH', size: 5 }),
      ]);
      setSummary(sumData);
      setRecentHighRisk(highRiskData.content);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-48 animate-pulse" />
          <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded w-28 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <ErrorState
        title="Couldn't load dashboard data"
        message={error || 'An unexpected error occurred while fetching system health metrics.'}
        onRetry={fetchData}
      />
    );
  }

  const flaggedPercentage = (summary.flaggedRate * 100).toFixed(1);
  const avgProbFormatted = (summary.avgFraudProbability * 100).toFixed(1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Overview Dashboard</h1>
          <p className="text-xs text-muted mt-1">Real-time fraud scoring volume, anomalies, and model health</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-surface border border-border text-text rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Data
          </button>
          <Link
            to="/transactions"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <span>Live Feed</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Top Row: 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Transactions"
          value={summary.totalTransactions.toLocaleString()}
          subtitle="All transactions ingested"
          icon={<CreditCard className="w-5 h-5" />}
        />
        <StatCard
          title="Flagged Rate"
          value={`${flaggedPercentage}%`}
          subtitle="Transactions flagged HIGH risk"
          icon={<AlertTriangle className="w-5 h-5" />}
          trend={{
            value: summary.flaggedRate > 0.05 ? 'Elevated' : 'Normal',
            isPositive: summary.flaggedRate <= 0.05,
          }}
        />
        <StatCard
          title="Active Model"
          value={summary.activeModelVersion}
          subtitle="XGBoost production pipeline"
          icon={<Cpu className="w-5 h-5" />}
          trend={{ value: 'Serving', isNeutral: true }}
        />
        <StatCard
          title="Avg Fraud Probability"
          value={`${avgProbFormatted}%`}
          subtitle="Population score mean"
          icon={<Percent className="w-5 h-5" />}
        />
      </div>

      {/* Main Grid: Chart & Recent High-Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Distribution Chart */}
        <div className="lg:col-span-2 bg-surface rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-text">Fraud Probability Distribution</h2>
              <p className="text-xs text-muted mt-0.5">Scored transaction counts partitioned by risk tiers</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> Low
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Medium
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600" /> High
              </span>
            </div>
          </div>
          <ScoreChart data={summary.scoreDistribution} />
        </div>

        {/* Recent High-Risk Transactions Panel */}
        <div className="bg-surface rounded-xl p-6 border border-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-text">Recent High-Risk</h2>
                <p className="text-xs text-muted mt-0.5">Latest transactions exceeding 0.70 threshold</p>
              </div>
              <Link
                to="/transactions?riskTier=HIGH"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentHighRisk.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                No high-risk transactions detected recently.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentHighRisk.map((tx) => (
                  <div
                    key={tx.transactionId}
                    onClick={() => navigate(`/transactions/${tx.transactionId}`)}
                    className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 -mx-2 rounded-lg transition-colors group"
                  >
                    <div className="space-y-0.5">
                      <span className="font-mono text-xs font-semibold text-text group-hover:text-primary transition-colors block">
                        {tx.transactionRef}
                      </span>
                      <span className="text-[11px] text-muted block font-mono">
                        {tx.accountId} · {new Date(tx.transactionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="font-mono text-xs font-semibold block text-text">
                        ${tx.amount.toFixed(2)}
                      </span>
                      <RiskBadge riskTier={tx.riskTier} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <Link
              to="/transactions"
              className="w-full py-2 px-3 text-xs font-medium text-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text rounded-lg block transition-colors"
            >
              Browse All Transactions →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
