import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-surface rounded-xl p-6 border border-border animate-pulse">
    <div className="flex justify-between items-center mb-4">
      <div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded w-24" />
      <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700/60 rounded-lg" />
    </div>
    <div className="h-8 bg-slate-200 dark:bg-slate-700/60 rounded w-32 mb-2" />
    <div className="h-3 bg-slate-200 dark:bg-slate-700/60 rounded w-20" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full space-y-3 p-4">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-3 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded w-36" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded w-24" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded w-20 ml-auto" />
        <div className="h-6 bg-slate-200 dark:bg-slate-700/60 rounded-full w-16" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded w-28" />
      </div>
    ))}
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <div className="bg-surface rounded-xl p-6 border border-border animate-pulse">
    <div className="h-5 bg-slate-200 dark:bg-slate-700/60 rounded w-48 mb-6" />
    <div className="h-56 bg-slate-100 dark:bg-slate-800/40 rounded-lg flex items-end gap-3 p-4">
      <div className="h-24 bg-slate-200 dark:bg-slate-700/60 rounded flex-1" />
      <div className="h-40 bg-slate-200 dark:bg-slate-700/60 rounded flex-1" />
      <div className="h-32 bg-slate-200 dark:bg-slate-700/60 rounded flex-1" />
      <div className="h-48 bg-slate-200 dark:bg-slate-700/60 rounded flex-1" />
      <div className="h-20 bg-slate-200 dark:bg-slate-700/60 rounded flex-1" />
    </div>
  </div>
);
