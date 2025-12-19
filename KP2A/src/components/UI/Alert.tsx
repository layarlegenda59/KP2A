import React from 'react';
import { clsx } from 'clsx';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ variant = 'default', className, children, ...props }) => {
  const variantClasses = {
    default: 'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-900/20 dark:text-gray-200',
    success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-200',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200',
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200',
    info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-200',
  };
  return (
    <div className={clsx('rounded-md border p-4 text-sm', variantClasses[variant], className)} {...props}>
      {children}
    </div>
  );
};

export const AlertDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, children, ...props }) => (
  <p className={clsx('mt-1 text-sm', className)} {...props}>
    {children}
  </p>
);

export default Alert;
