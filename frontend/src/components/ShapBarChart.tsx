import React from 'react';
import { ShapFeature } from '../types';

interface ShapBarChartProps {
  features: ShapFeature[];
}

export const ShapBarChart: React.FC<ShapBarChartProps> = ({ features }) => {
  if (!features || features.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted">
        No feature explanation data available for this transaction.
      </div>
    );
  }

  // Find max absolute contribution for scale normalization
  const maxAbs = Math.max(...features.map((f) => Math.abs(f.contribution)), 0.01);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between text-xs text-muted mb-2">
        <span>Feature (Actual Value)</span>
        <span>SHAP Contribution</span>
      </div>

      {features.map((feat, idx) => {
        const isPositive = feat.contribution >= 0;
        const absPercent = Math.min(100, Math.round((Math.abs(feat.contribution) / maxAbs) * 100));

        return (
          <div key={idx} className="group flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-medium text-text flex items-center gap-1.5">
                {feat.feature}
                <span className="text-muted text-[11px]">
                  ({typeof feat.value === 'number' ? feat.value.toFixed(2) : feat.value})
                </span>
              </span>
              <span
                className={`font-mono font-semibold text-xs ${
                  isPositive
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isPositive ? '+' : ''}
                {feat.contribution.toFixed(4)}
              </span>
            </div>

            {/* Split directional progress bar */}
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex relative">
              {/* Midline */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-600 z-10" />

              {/* Left half (Legitimate negative shift) */}
              <div className="w-1/2 flex justify-end">
                {!isPositive && (
                  <div
                    className="h-full bg-emerald-500 rounded-l-full transition-all duration-300"
                    style={{ width: `${absPercent}%` }}
                  />
                )}
              </div>

              {/* Right half (Fraud positive shift) */}
              <div className="w-1/2 flex justify-start">
                {isPositive && (
                  <div
                    className="h-full bg-red-500 rounded-r-full transition-all duration-300"
                    style={{ width: `${absPercent}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Pushes toward Legitimate (-)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Pushes toward Fraud (+)
        </span>
      </div>
    </div>
  );
};
