import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { ScoreBucket } from '../types';

interface ScoreChartProps {
  data: ScoreBucket[];
}

export const ScoreChart: React.FC<ScoreChartProps> = ({ data }) => {
  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case '0.0-0.2':
        return '#16A34A'; // Emerald (Low Risk)
      case '0.2-0.4':
        return '#10B981'; // Teal / Light Green
      case '0.4-0.6':
        return '#D97706'; // Amber (Medium Risk)
      case '0.6-0.8':
        return '#F97316'; // Orange
      case '0.8-1.0':
        return '#DC2626'; // Red (High Risk)
      default:
        return '#3B82F6';
    }
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
          <XAxis
            dataKey="bucket"
            stroke="var(--muted)"
            fontSize={12}
            tickLine={false}
            label={{ value: 'Predicted Fraud Probability', position: 'bottom', offset: 5, fill: 'var(--muted)', fontSize: 11 }}
          />
          <YAxis
            stroke="var(--muted)"
            fontSize={12}
            tickLine={false}
            allowDecimals={false}
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
            formatter={(value: any) => [`${value} transactions`, 'Volume']}
            labelFormatter={(label) => `Score range: ${label}`}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBucketColor(entry.bucket)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
