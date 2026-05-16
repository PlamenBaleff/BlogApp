'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

type Me = { id: string; name: string; email: string } | null;

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try {
        const userJson = localStorage.getItem('user');
        const token = localStorage.getItem('accessToken');
        setMe(userJson && token ? JSON.parse(userJson) : null);
      } catch {
        setMe(null);
      }
      setReady(true);
    };
    refresh();
    // Re-read when other tabs change storage AND when this tab dispatches
    // a custom auth-change event (login / register / logout).
    window.addEventListener('storage', refresh);
    window.addEventListener('auth-change', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('auth-change', refresh);
    };
  }, []);

  // Re-check auth on every route change — NavBar lives in the root layout and
  // doesn't unmount, so without this it would stay stale after navigation.
  useEffect(() => {
    try {
      const userJson = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');
      setMe(userJson && token ? JSON.parse(userJson) : null);
    } catch {
      setMe(null);
    }
  }, [pathname]);

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    document.cookie = 'accessToken=; Max-Age=0; path=/';
    setMe(null);
    window.dispatchEvent(new Event('auth-change'));
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
      <Link href="/" className="text-2xl font-bold text-blue-600">
        BlogHub
      </Link>
      <div className="space-x-4 flex items-center">
        <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">
          Home
        </Link>
        <Link href="/blog" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">
          Blog
        </Link>
        {!ready ? null : me ? (
          <>
            <Link
              href="/admin/posts"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600"
            >
              My Posts
            </Link>
            <Link
              href="/admin/posts/new"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600"
            >
              New
            </Link>
            <span className="text-gray-500 text-sm">{me.name}</span>
            <button
              onClick={logout}
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
