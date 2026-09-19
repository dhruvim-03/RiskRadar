import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Plus,
  ArrowUpDown,
  Filter,
  RefreshCw,
  X
} from 'lucide-react';
import { transactionApi } from '../api/transactionApi';
import { Transaction } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';

export const Transactions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const riskTierParam = searchParams.get('riskTier') || 'ALL';
  const [riskTier, setRiskTier] = useState<string>(riskTierParam);
  const [search, setSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // New transaction modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newTxRef, setNewTxRef] = useState(`TXN-${Date.now()}`);
  const [newAccountId, setNewAccountId] = useState('ACC-88213');
  const [newAmount, setNewAmount] = useState('1450.00');
  const [newCategory, setNewCategory] = useState('electronics');

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await transactionApi.getTransactions({
        riskTier: riskTier !== 'ALL' ? riskTier : undefined,
        search: search.trim() || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        page,
        size: pageSize,
      });

      setTransactions(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRiskTier(riskTierParam);
  }, [riskTierParam]);

  useEffect(() => {
    fetchTransactions();
  }, [page, pageSize, riskTier]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchTransactions();
  };

  const handleTierFilter = (tier: string) => {
    setRiskTier(tier);
    setPage(0);
    if (tier === 'ALL') {
      searchParams.delete('riskTier');
    } else {
      searchParams.set('riskTier', tier);
    }
    setSearchParams(searchParams);
  };

  const clearFilters = () => {
    setRiskTier('ALL');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(0);
    setSearchParams({});
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await transactionApi.submitTransaction({
        transactionRef: newTxRef,
        accountId: newAccountId,
        amount: parseFloat(newAmount),
        merchantCategory: newCategory,
        transactionTime: new Date().toISOString(),
        rawFeatures: { v1: -1.2, v2: 0.8, v3: -0.5 },
      });

      setModalOpen(false);
      setNewTxRef(`TXN-${Date.now()}`);
      navigate(`/transactions/${result.transactionId}`);
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Transaction submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Transaction Feed</h1>
          <p className="text-xs text-muted mt-1">
            Real-time scored events with risk tiers, fraud probabilities, and explainability links
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNewTxRef(`TXN-${Date.now()}`);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Submit Transaction
          </button>
          <button
            onClick={fetchTransactions}
            className="p-2 text-muted hover:text-text bg-surface border border-border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh transactions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="bg-surface rounded-xl p-4 border border-border shadow-sm space-y-3 sticky top-4 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Risk-Tier Multi-Select Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map((tier) => (
              <button
                key={tier}
                onClick={() => handleTierFilter(tier)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  riskTier === tier
                    ? 'bg-primary text-white shadow-sm font-semibold'
                    : 'bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-muted border border-border'
                }`}
              >
                {tier === 'ALL' ? 'All Tiers' : tier}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference or account ID..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
            />
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted pointer-events-none" />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchTransactions();
                }}
                className="absolute right-2.5 top-2 text-muted hover:text-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Optional Date Range Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border text-xs text-muted">
          <div className="flex items-center gap-2">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-background border border-border rounded text-text text-xs focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-background border border-border rounded text-text text-xs focus:outline-none"
            />
          </div>
          {(startDate || endDate || search || riskTier !== 'ALL') && (
            <button
              onClick={clearFilters}
              className="text-xs text-primary hover:underline ml-auto font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={fetchTransactions} />
        ) : loading ? (
          <TableSkeleton rows={8} />
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="No transactions match the current filter criteria."
            actionLabel="Clear Filters"
            onAction={clearFilters}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/75 dark:bg-slate-900/50 text-muted font-medium">
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Account ID</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Risk Tier</th>
                  <th className="py-3 px-4">Fraud Probability</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => {
                  const prob = tx.fraudProbability || 0;
                  const probPercent = Math.round(prob * 100);

                  return (
                    <tr
                      key={tx.transactionId}
                      onClick={() => navigate(`/transactions/${tx.transactionId}`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-text group-hover:text-primary transition-colors">
                        {tx.transactionRef}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted">
                        {tx.accountId}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-text">
                        ${tx.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <RiskBadge riskTier={tx.riskTier} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 max-w-[130px]">
                          <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                prob < 0.3 ? 'bg-emerald-500' : prob <= 0.7 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, probPercent)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-muted">{probPercent}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted text-[11px]">
                        {new Date(tx.transactionTime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <ChevronRight className="w-4 h-4 text-muted group-hover:text-text group-hover:translate-x-0.5 transition-all inline" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && transactions.length > 0 && (
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
            <div>
              Showing <span className="font-mono font-medium text-text">{page * pageSize + 1}</span> to{' '}
              <span className="font-mono font-medium text-text">
                {Math.min((page + 1) * pageSize, totalElements)}
              </span>{' '}
              of <span className="font-mono font-medium text-text">{totalElements}</span> transactions
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="bg-background border border-border rounded px-2 py-1 text-xs text-text focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded border border-border bg-surface text-muted hover:text-text disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded border border-border bg-surface text-muted hover:text-text disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-xl max-w-md w-full p-6 shadow-xl relative animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="text-base font-bold text-text">Submit Transaction for Scoring</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-text p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitError && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {submitError}
              </div>
            )}

            <form onSubmit={handleCreateTransaction} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-text mb-1">Transaction Ref</label>
                <input
                  type="text"
                  value={newTxRef}
                  onChange={(e) => setNewTxRef(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg font-mono text-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-text mb-1">Account ID</label>
                <input
                  type="text"
                  value={newAccountId}
                  onChange={(e) => setNewAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg font-mono text-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-text mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg font-mono text-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-text mb-1">Merchant Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-text focus:outline-none"
                >
                  <option value="electronics">Electronics (High Velocity)</option>
                  <option value="luxury">Luxury Goods</option>
                  <option value="travel">Travel & Airlines</option>
                  <option value="grocery">Grocery</option>
                  <option value="dining">Dining & Restaurants</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-muted hover:text-text font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? 'Scoring...' : 'Score Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
