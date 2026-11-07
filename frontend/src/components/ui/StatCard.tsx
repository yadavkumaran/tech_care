import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  footnote?: string;
  trend?: string;
  trendPositive?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconBg = '#eff6ff',
  iconColor = '#0071e3',
  footnote,
  trend,
  trendPositive,
}) => {
  return (
    <div className="stat-card">
      <div
        className="stat-icon"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        {(footnote || trend) && (
          <div className="stat-footnote" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {trend && (
              <span
                style={{
                  fontWeight: 600,
                  color: trendPositive ? '#059669' : '#dc2626',
                }}
              >
                {trend}
              </span>
            )}
            {footnote && <span>{footnote}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

