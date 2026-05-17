'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

interface PaginationProps {
  page: number;
  pages: number;
  /** Optional total count, shown next to the page numbers when provided. */
  total?: number;
}

/**
 * Server-friendly pagination component: each page is a real link with the
 * `page` query param. Other query params are preserved so it composes with
 * filters / search.
 */
// Locale-independent thousands separator so server and client render
// identical markup (avoids React hydration mismatches).
function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function Pagination({ page, pages, total }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pages <= 1) return null;

  const hrefFor = (n: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('page', String(n));
    return `${pathname}?${sp.toString()}`;
  };

  const window = 2;
  const start = Math.max(1, page - window);
  const end = Math.min(pages, page + window);
  const pageNumbers: number[] = [];
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  const linkBase =
    'px-3 py-1.5 rounded-md text-sm border transition';
  const active =
    'bg-blue-600 text-white border-blue-600';
  const inactive =
    'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 ' +
    'border-gray-300 dark:border-gray-700 hover:border-blue-600';

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 pt-4"
    >
      <p className="text-sm text-gray-500">
        Page {page} of {pages}
        {typeof total === 'number' && ` · ${formatCount(total)} items`}
      </p>
      <div className="flex flex-wrap gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className={`${linkBase} ${inactive}`}>
            ← Prev
          </Link>
        )}
        {start > 1 && (
          <>
            <Link href={hrefFor(1)} className={`${linkBase} ${inactive}`}>
              1
            </Link>
            {start > 2 && <span className="px-1 text-gray-400">…</span>}
          </>
        )}
        {pageNumbers.map((n) => (
          <Link
            key={n}
            href={hrefFor(n)}
            className={`${linkBase} ${n === page ? active : inactive}`}
            aria-current={n === page ? 'page' : undefined}
          >
            {n}
          </Link>
        ))}
        {end < pages && (
          <>
            {end < pages - 1 && <span className="px-1 text-gray-400">…</span>}
            <Link href={hrefFor(pages)} className={`${linkBase} ${inactive}`}>
              {pages}
            </Link>
          </>
        )}
        {page < pages && (
          <Link href={hrefFor(page + 1)} className={`${linkBase} ${inactive}`}>
            Next →
          </Link>
        )}
      </div>
    </nav>
  );
}
