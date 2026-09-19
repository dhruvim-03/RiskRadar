import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Cpu,
  CheckCircle2,
  AlertOctagon,
  Clock
} from 'lucide-react';
import { transactionApi } from '../api/transactionApi';
import { Transaction, ShapFeature } from '../types';
import { useAuth } from '../context/AuthContext';
import { RiskBadge } from '../components/RiskBadge';
import { FraudGauge } from '../components/FraudGauge';
import { ShapBarChart } from '../components/ShapBarChart';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';

export const TransactionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawExpanded, setRawExpanded] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [updatingFeedback, setUpdatingFeedback] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await transactionApi.getTransactionDetail(Number(id));
      setTx(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Transaction not found or could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleFeedback = async (isFraud: boolean) => {
    if (!tx) return;
    setUpdatingFeedback(true);
    try {
      await transactionApi.updateFeedback(tx.transactionId, isFraud);
      setTx({ ...tx, isConfirmedFraud: isFraud });
      setFeedbackSuccess(
        isFraud ? 'Transaction marked as confirmed fraud.' : 'Transaction marked as confirmed legitimate.'
      );
      setTimeout(() => setFeedbackSuccess(null), 4000);
    } catch (err: any) {
      alert('Failed to update fraud feedback');
    } finally {
      setUpdatingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-32 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !tx) {
    return (
      <ErrorState
        title="Transaction Not Found"
        message={error || 'Unable to retrieve record details.'}
        onRetry={() => navigate('/transactions')}
      />
    );
  }

  const modelVer = tx.modelVersion || 'v1';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-text transition-colors"
            title="Back to transaction feed"
            aria-label="Back to transaction feed"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-text font-mono">
                {tx.transactionRef}
              </h1>
              <RiskBadge riskTier={tx.riskTier} />
            </div>
            <p className="text-xs text-muted mt-0.5 font-mono">ID: #{tx.transactionId} · Scored in real-time</p>
          </div>
        </div>

        {/* Feedback action buttons for analyst feedback loop */}
        <div className="flex items-center gap-2">
          {tx.isConfirmedFraud === true ? (
            <span className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4" /> Confirmed Fraud
            </span>
          ) : tx.isConfirmedFraud === false ? (
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Confirmed Legitimate
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFeedback(false)}
                disabled={updatingFeedback}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface text-muted hover:text-emerald-600 hover:border-emerald-500/30 transition-colors"
              >
                Mark Legitimate
              </button>
              <button
                onClick={() => handleFeedback(true)}
                disabled={updatingFeedback}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500/20 transition-colors"
              >
                Confirm Fraud
              </button>
            </div>
          )}
        </div>
      </div>

      {feedbackSuccess && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Transaction Fields Card */}
        <div className="bg-surface rounded-xl p-6 border border-border shadow-sm space-y-5">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-semibold text-text">Transaction Metadata</h2>
            <p className="text-xs text-muted mt-0.5">Core payment event details</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="text-muted flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5" /> Amount
              </div>
              <span className="font-mono text-base font-bold text-text">${tx.amount.toFixed(2)}</span>
            </div>

            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="text-muted flex items-center gap-1.5 mb-1">
                <CreditCard className="w-3.5 h-3.5" /> Account ID
              </div>
              <span className="font-mono text-sm font-semibold text-text">{tx.accountId}</span>
            </div>

            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="text-muted flex items-center gap-1.5 mb-1">
                <Tag className="w-3.5 h-3.5" /> Merchant Category
              </div>
              <span className="capitalize font-medium text-text">{tx.merchantCategory || 'Uncategorized'}</span>
            </div>

            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="text-muted flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5" /> Transaction Time
              </div>
              <span className="text-text font-mono text-[11px]">
                {new Date(tx.transactionTime).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Collapsible Advanced Raw Features */}
          <div className="pt-2 border-t border-border">
            <button
              onClick={() => setRawExpanded(!rawExpanded)}
              className="w-full flex items-center justify-between text-xs font-medium text-muted hover:text-text py-2"
            >
              <span>Advanced PCA & Raw Vector Payload</span>
              {rawExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {rawExpanded && (
              <div className="mt-2 p-3 bg-background rounded-lg border border-border max-h-56 overflow-y-auto font-mono text-[11px] text-muted space-y-1">
                {tx.rawFeatures && Object.keys(tx.rawFeatures).length > 0 ? (
                  Object.entries(tx.rawFeatures).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-0.5 border-b border-border/50">
                      <span className="text-text font-semibold">{k}:</span>
                      <span>{typeof v === 'number' ? v.toFixed(5) : String(v)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-muted">No additional raw features attached.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Risk Assessment & SHAP Explainability */}
        <div className="bg-surface rounded-xl p-6 border border-border shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-semibold text-text">ML Risk & Explainability</h2>
              <p className="text-xs text-muted mt-0.5">XGBoost prediction & SHAP TreeExplainer breakdown</p>
            </div>

            {/* Model Version Chip */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted">Model:</span>
              {isAdmin ? (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-mono font-medium hover:underline"
                  title="View model version in Admin management"
                >
                  <Cpu className="w-3 h-3" />
                  {modelVer}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-text text-xs font-mono">
                  {modelVer}
                </span>
              )}
            </div>
          </div>

          {/* Radial Risk Gauge */}
          <FraudGauge probability={tx.fraudProbability} riskTier={tx.riskTier} />

          {/* SHAP Feature Contribution Chart */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-xs font-semibold text-text uppercase tracking-wider mb-3">
              Top Contributing Features (SHAP)
            </h3>
            <ShapBarChart features={tx.shapTopFeatures || []} />
          </div>
        </div>
      </div>
    </div>
  );
};
