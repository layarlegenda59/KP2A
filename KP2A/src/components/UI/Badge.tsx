import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ variant = 'default', className, children, ...props }) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
  };

  return (
    <span
      className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variantClasses[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
