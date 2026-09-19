import React from 'react';

interface RiskBadgeProps {
  riskTier: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ riskTier, size = 'md' }) => {
  const tier = (riskTier || 'LOW').toUpperCase();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const colorClasses = {
    LOW: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    MEDIUM: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    HIGH: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
  };

  const badgeClass = colorClasses[tier as keyof typeof colorClasses] || 'bg-slate-500/10 text-slate-500 border border-slate-500/20';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses[size]} ${badgeClass} tracking-wide`}
      role="status"
      aria-label={`Risk tier: ${tier}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        tier === 'HIGH' ? 'bg-red-500 animate-pulse' : tier === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
      }`} />
      {tier}
    </span>
  );
};
