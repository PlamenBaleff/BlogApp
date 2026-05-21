'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authHeader, getSession, saveSession } from '../lib/session';
import { Input, Textarea } from '../../components/Input';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { ImageUpload } from '../../components/ImageUpload';

interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  bio: string | null;
  avatar: string | null;
  theme: 'light' | 'dark';
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
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
      setTheme(data.theme === 'dark' ? 'dark' : 'light');
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
          theme,
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
      // and the ThemeProvider applies the new theme immediately.
      const current = getSession();
      if (current) {
        saveSession({
          accessToken: current.accessToken,
          refreshToken: current.refreshToken ?? '',
          user: {
            ...current.user,
            name: json.data.name,
            avatar: json.data.avatar,
            theme: json.data.theme,
          },
        });
      }
      setName(json.data.name);
      setBio(json.data.bio ?? '');
      setAvatar(json.data.avatar ?? '');
      setTheme(json.data.theme === 'dark' ? 'dark' : 'light');
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
        <ImageUpload
          label="Profile picture"
          variant="avatar"
          folder="avatars"
          value={avatar || null}
          onChange={(url) => setAvatar(url ?? '')}
          disabled={saving}
          hint="Upload a JPG, PNG, WebP or GIF (up to 5 MB). Leave empty to use the default avatar."
        />
        <Textarea
          label="Bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
          hint="A short description shown on your posts."
        />

        <fieldset className="space-y-2">
          <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            App theme
          </legend>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Choose how BlogHub looks for you. Light is the default.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ThemeOption
              value="light"
              current={theme}
              onSelect={setTheme}
              title="Light"
              description="Bright, paper-white background with deep slate text."
              swatch={
                <div className="h-10 w-full rounded-md border border-gray-200 bg-gradient-to-br from-white to-slate-100 flex items-center px-2">
                  <span className="text-xs font-semibold text-slate-900">Aa</span>
                  <span className="ml-auto inline-block h-3 w-3 rounded-full bg-blue-600" />
                </div>
              }
            />
            <ThemeOption
              value="dark"
              current={theme}
              onSelect={setTheme}
              title="Dark"
              description="Deep navy-slate canvas, easy on the eyes at night."
              swatch={
                <div className="h-10 w-full rounded-md border border-gray-700 bg-gradient-to-br from-[#0b1220] to-[#111827] flex items-center px-2">
                  <span className="text-xs font-semibold text-gray-100">Aa</span>
                  <span className="ml-auto inline-block h-3 w-3 rounded-full bg-blue-400" />
                </div>
              }
            />
          </div>
        </fieldset>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface ThemeOptionProps {
  value: 'light' | 'dark';
  current: 'light' | 'dark';
  onSelect: (value: 'light' | 'dark') => void;
  title: string;
  description: string;
  swatch: React.ReactNode;
}

function ThemeOption({
  value,
  current,
  onSelect,
  title,
  description,
  swatch,
}: ThemeOptionProps) {
  const selected = current === value;
  return (
    <label
      className={[
        'relative cursor-pointer rounded-lg border p-3 flex flex-col gap-2 transition',
        selected
          ? 'border-blue-600 ring-2 ring-blue-600/30 bg-blue-50 dark:bg-blue-950/40'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700',
      ].join(' ')}
    >
      <input
        type="radio"
        name="theme"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      {swatch}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        <span
          aria-hidden
          className={[
            'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
            selected
              ? 'border-blue-600 bg-blue-600'
              : 'border-gray-300 dark:border-gray-600',
          ].join(' ')}
        >
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
      </div>
    </label>
  );
}
