import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={24} />
      </div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-text">{description}</div>
      {actionText && onAction && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onAction}>
          {actionIcon}
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};

