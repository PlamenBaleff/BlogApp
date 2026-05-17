import { ReactNode } from 'react';

type Variant = 'error' | 'success' | 'info' | 'warning';

const variantClasses: Record<Variant, string> = {
  error: 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200 border-red-200 dark:border-red-800',
  success: 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-200 border-green-200 dark:border-green-800',
  info: 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  warning: 'bg-yellow-50 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
};

export function Alert({
  variant = 'info',
  children,
  className = '',
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border p-3 rounded-lg text-sm ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}
