'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { clearSession, getSession, type SessionUser } from './lib/session';

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const session = getSession();
      setMe(session?.user ?? null);
      setReady(true);
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('auth-change', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('auth-change', refresh);
    };
  }, []);

  useEffect(() => {
    setMe(getSession()?.user ?? null);
    setOpen(false);
  }, [pathname]);

  const logout = async () => {
    await clearSession();
    setMe(null);
    router.push('/');
    router.refresh();
  };

  const linkClass =
    'text-gray-700 dark:text-gray-300 hover:text-blue-600 transition';

  const guestLinks = (
    <>
      <Link href="/auth/login" className={linkClass}>
        Login
      </Link>
      <Link href="/auth/register" className={linkClass}>
        Register
      </Link>
    </>
  );

  const userLinks = me && (
    <>
      <Link href="/admin/posts" className={linkClass}>
        My Posts
      </Link>
      <Link href="/admin/posts/new" className={linkClass}>
        New
      </Link>
      <Link href="/profile" className={linkClass}>
        Profile
      </Link>
      {me.role === 'admin' && (
        <Link
          href="/admin/users"
          className="text-purple-700 dark:text-purple-300 hover:text-purple-500 font-semibold"
        >
          Admin
        </Link>
      )}
      <button onClick={logout} className={linkClass}>
        Logout
      </button>
    </>
  );

  return (
    <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          BlogHub
        </Link>
        {ready && me && (
          <span className="text-gray-600 dark:text-gray-300 text-sm">
            Hello, {me.name}
          </span>
        )}
      </div>

      {/* Desktop nav */}
      <div className="hidden md:flex space-x-4 items-center">
        <Link href="/" className={linkClass}>
          Home
        </Link>
        <Link href="/blog" className={linkClass}>
          Blog
        </Link>
        <Link href="/about" className={linkClass}>
          About
        </Link>
        {!ready ? null : me ? userLinks : guestLinks}
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 text-gray-700 dark:text-gray-300"
        aria-label="Toggle menu"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 md:hidden bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col space-y-3">
            <Link href="/" className={linkClass}>
              Home
            </Link>
            <Link href="/blog" className={linkClass}>
              Blog
            </Link>
            <Link href="/about" className={linkClass}>
              About
            </Link>
            {!ready ? null : me ? userLinks : guestLinks}
          </div>
        </div>
      )}
    </nav>
  );
}
