import React from 'react';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  withDot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  withDot = true,
  className = '',
  style,
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`} style={style}>
      {withDot && <span className="badge-dot" />}
      <span>{children}</span>
    </span>
  );
};

