'use client';

import { useEffect } from 'react';
import { getSession } from './lib/session';

/**
 * Applies the user's saved theme to <html> as the `dark` class.
 * Listens to `auth-change` so login / logout / profile updates take effect
 * immediately, and to `storage` so multiple tabs stay in sync.
 *
 * The FOUC-prevention bootstrap (run before hydration) lives inline in
 * <head> in app/layout.tsx. This component just keeps things in sync at
 * runtime.
 */
export function ThemeProvider() {
  useEffect(() => {
    const apply = () => {
      const session = getSession();
      const stored = (() => {
        try {
          return localStorage.getItem('theme');
        } catch {
          return null;
        }
      })();
      const theme =
        session?.user?.theme ?? (stored === 'dark' ? 'dark' : 'light');
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    apply();
    window.addEventListener('auth-change', apply);
    window.addEventListener('storage', apply);
    return () => {
      window.removeEventListener('auth-change', apply);
      window.removeEventListener('storage', apply);
    };
  }, []);

  return null;
}
