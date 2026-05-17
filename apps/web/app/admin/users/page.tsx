'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authHeader, getSession } from '../../lib/session';
import { Button } from '../../../components/Button';
import { Alert } from '../../../components/Alert';
import { Pagination } from '../../../components/Pagination';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  avatar: string | null;
  createdAt: string;
  postCount: number;
  commentCount: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const [me, setMe] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/admin/users?page=${page}&limit=20`, {
      headers: authHeader(),
    });
    if (res.status === 401 || res.status === 403) {
      router.replace('/');
      return;
    }
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Failed to load users');
      setLoading(false);
      return;
    }
    setUsers(json.data);
    setPages(json.pages);
    setTotal(json.total);
    setLoading(false);
  }, [page, router]);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/auth/login');
      return;
    }
    if (session.user.role !== 'admin') {
      router.replace('/');
      return;
    }
    setMe(session.user.id);
    void load();
  }, [load, router]);

  const toggleRole = async (u: AdminUser) => {
    setBusyId(u.id);
    setError('');
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ role: nextRole }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Failed to update role');
    } else {
      setUsers((rows) =>
        rows.map((r) => (r.id === u.id ? { ...r, role: nextRole } : r)),
      );
    }
    setBusyId(null);
  };

  const remove = async (u: AdminUser) => {
    if (
      !confirm(
        `Delete ${u.email}? This also removes their posts and comments. This cannot be undone.`,
      )
    )
      return;
    setBusyId(u.id);
    setError('');
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'DELETE',
      headers: authHeader(),
    });
    if (res.ok) {
      void load();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error || 'Failed to delete user');
    }
    setBusyId(null);
  };

  if (loading) {
    return <p className="text-gray-600 dark:text-gray-400">Loading users…</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Users
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} accounts total. Admins can promote, demote and delete users.
          </p>
        </div>
      </header>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
            <tr>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-right px-4 py-3">Posts</th>
              <th className="text-right px-4 py-3">Comments</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {users.map((u) => {
              const isMe = u.id === me;
              return (
                <tr key={u.id} className="text-gray-800 dark:text-gray-200">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.role === 'admin'
                          ? 'inline-block px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                          : 'inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {u.postCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {u.commentCount}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isMe || busyId === u.id}
                        onClick={() => toggleRole(u)}
                      >
                        {u.role === 'admin' ? 'Demote' : 'Promote'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={isMe || busyId === u.id}
                        onClick={() => remove(u)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} total={total} />
    </div>
  );
}
