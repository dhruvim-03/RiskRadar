import React from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

interface FraudGaugeProps {
  probability: number; // 0 to 1
  riskTier: string;
}

export const FraudGauge: React.FC<FraudGaugeProps> = ({ probability, riskTier }) => {
  const percentage = Math.round(probability * 100);

  const getColor = () => {
    if (probability < 0.30) return '#16A34A'; // emerald
    if (probability <= 0.70) return '#D97706'; // amber
    return '#DC2626'; // red
  };

  const color = getColor();
  const data = [{ name: 'Fraud Risk', value: percentage, fill: color }];

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-48 h-48 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={14}
            data={data}
            startAngle={210}
            endAngle={-30}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: 'var(--border)' }}
              dataKey="value"
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold font-mono" style={{ color }}>
            {percentage}%
          </span>
          <span className="text-xs uppercase font-semibold text-muted tracking-wider mt-0.5">
            {riskTier} RISK
          </span>
        </div>
      </div>
      <div className="text-xs text-muted mt-2 text-center">
        Fraud Score: <span className="font-mono font-medium">{probability.toFixed(4)}</span>
      </div>
    </div>
  );
};
