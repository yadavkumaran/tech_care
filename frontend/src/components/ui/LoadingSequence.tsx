import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 6,
  className = '',
  style,
}) => {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

export const SkeletonTableRow: React.FC<{
  columns?: number;
  colWidths?: (string | number)[];
}> = ({ columns = 8, colWidths = [] }) => {
  return (
    <tr className="skeleton-row">
      {Array.from({ length: columns }).map((_, idx) => (
        <td key={idx} style={{ padding: '12px 14px' }}>
          <Skeleton
            height={idx === 0 ? 18 : 14}
            width={colWidths[idx] || (idx === 0 ? '70%' : idx === columns - 1 ? '50%' : '85%')}
          />
        </td>
      ))}
    </tr>
  );
};

export const SkeletonTableRows: React.FC<{
  count?: number;
  columns?: number;
  colWidths?: (string | number)[];
}> = ({ count = 5, columns = 8, colWidths = [] }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} colWidths={colWidths} />
      ))}
    </>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="mobile-data-card skeleton-card">
      <div className="mobile-card-header" style={{ paddingBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height={16} style={{ marginBottom: 6 }} />
          <Skeleton width="60%" height={14} />
        </div>
        <Skeleton width={70} height={22} borderRadius={12} />
      </div>
      <div className="mobile-card-body" style={{ marginTop: 8 }}>
        <div>
          <Skeleton width="30%" height={11} style={{ marginBottom: 4 }} />
          <Skeleton width="75%" height={14} />
        </div>
        <div>
          <Skeleton width="30%" height={11} style={{ marginBottom: 4 }} />
          <Skeleton width="65%" height={14} />
        </div>
      </div>
      <div className="mobile-card-footer" style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width={90} height={14} />
        <div style={{ display: 'flex', gap: 6 }}>
          <Skeleton width={60} height={28} borderRadius={6} />
          <Skeleton width={60} height={28} borderRadius={6} />
        </div>
      </div>
    </div>
  );
};

export const SkeletonStatCard: React.FC = () => {
  return (
    <div className="card stat-card skeleton-stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <Skeleton width="55%" height={13} />
        <Skeleton width={38} height={38} borderRadius={10} />
      </div>
      <Skeleton width="45%" height={26} style={{ marginBottom: 8 }} />
      <Skeleton width="70%" height={12} />
    </div>
  );
};

export const LoadingSequence: React.FC<{
  message?: string;
  submessage?: string;
  height?: number | string;
}> = ({
  message = 'Loading data...',
  submessage = 'Synchronizing real-time workshop records',
  height = 180,
}) => {
  return (
    <div
      className="loading-sequence-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        minHeight: height,
        textAlign: 'center',
      }}
    >
      <div className="loading-sequence-pulse-ring">
        <div className="loading-sequence-spinner" />
      </div>
      <div style={{ fontWeight: 600, fontSize: '0.90rem', color: 'var(--text-primary)', marginTop: 14 }}>
        {message}
      </div>
      {submessage && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
          {submessage}
        </div>
      )}
    </div>
  );
};
