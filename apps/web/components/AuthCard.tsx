import { ReactNode } from 'react';

/**
 * Centered card layout for auth-related pages (login / register). Provides
 * the standard gradient background, white card and title block so the
 * individual pages only need to render the form contents.
 */
export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
            {subtitle}
          </p>
        )}
        <div className="space-y-4">{children}</div>
        {footer && (
          <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
