'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authHeader, getSession, saveSession } from '../lib/session';
import { Input, Textarea } from '../../components/Input';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';

interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  bio: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!getSession()) {
      router.replace('/auth/login');
      return;
    }
    (async () => {
      const res = await fetch('/api/auth/me', { headers: authHeader() });
      if (!res.ok) {
        router.replace('/auth/login');
        return;
      }
      const { data } = await res.json();
      setProfile(data);
      setName(data.name);
      setBio(data.bio ?? '');
      setAvatar(data.avatar ?? '');
      setLoading(false);
    })();
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          name,
          bio: bio || null,
          avatar: avatar || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to save');
        return;
      }
      setProfile(json.data);
      setSuccess('Profile updated.');
      // keep cached "user" in sync so NavBar reflects the new name/avatar
      const current = getSession();
      if (current) {
        saveSession({
          accessToken: current.accessToken,
          refreshToken: current.refreshToken ?? '',
          user: {
            ...current.user,
            name: json.data.name,
            avatar: json.data.avatar,
          },
        });
      }
      setName(json.data.name);
      setBio(json.data.bio ?? '');
      setAvatar(json.data.avatar ?? '');
    } catch {
      setError('An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-gray-600 dark:text-gray-400">Loading profile…</p>;
  }
  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        {profile.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar}
            alt=""
            className="w-16 h-16 rounded-full border border-gray-200 dark:border-gray-800"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My profile</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {profile.email} ·{' '}
            <span
              className={
                profile.role === 'admin'
                  ? 'text-purple-600 dark:text-purple-300 font-semibold'
                  : ''
              }
            >
              {profile.role}
            </span>
          </p>
        </div>
      </header>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Display name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Avatar URL"
          name="avatar"
          type="url"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="https://…"
          hint="Public URL to a profile picture. Leave blank to use the default avatar."
        />
        <Textarea
          label="Bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
          hint="A short description shown on your posts."
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
