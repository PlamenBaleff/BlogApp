import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { secureStorage } from '../../lib/secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const TABLET_BREAKPOINT = 700;
const FORM_MAX_WIDTH = 720;

type Profile = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  bio: string | null;
  avatar: string | null;
  theme: 'light' | 'dark';
};

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await secureStorage.getItem('accessToken');
        if (!token) {
          router.replace('/(auth)/login');
          return;
        }
        const res = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data: Profile = res.data.data;
        setProfile(data);
        setName(data.name);
        setBio(data.bio ?? '');
        setTheme(data.theme === 'dark' ? 'dark' : 'light');
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const onSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const token = await secureStorage.getItem('accessToken');
      const res = await axios.patch(
        `${API_URL}/api/auth/me`,
        {
          name: name.trim(),
          bio: bio.trim() || null,
          theme,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const updated: Profile = res.data.data;
      setProfile(updated);
      setName(updated.name);
      setBio(updated.bio ?? '');
      setTheme(updated.theme === 'dark' ? 'dark' : 'light');

      // Keep cached user in sync so HeaderMenu shows the new name.
      const cachedJson = await secureStorage.getItem('user');
      if (cachedJson) {
        try {
          const cached = JSON.parse(cachedJson);
          await secureStorage.setItem(
            'user',
            JSON.stringify({
              ...cached,
              name: updated.name,
              avatar: updated.avatar,
              theme: updated.theme,
            }),
          );
        } catch {
          /* ignore */
        }
      }
      setSuccess('Profile updated.');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Profile not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        { padding: 20, paddingBottom: 60 },
        isTablet && {
          maxWidth: FORM_MAX_WIDTH,
          alignSelf: 'center',
          width: '100%',
        },
      ]}
    >
      <View style={styles.avatarRow}>
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>
            {profile.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>{profile.name}</Text>
          <Text style={styles.subheading}>
            {profile.email}
            {profile.role === 'admin' ? '  ·  ADMIN' : ''}
          </Text>
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>{success}</Text>}

      <Text style={styles.label}>Display name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        value={bio}
        onChangeText={setBio}
        placeholder="A short description"
        multiline
        textAlignVertical="top"
      />

      <Text style={[styles.label, { marginTop: 18 }]}>App theme</Text>
      <Text style={styles.hint}>
        Choose how BlogHub looks. Light is the default.
      </Text>
      <View style={styles.themeRow}>
        <ThemeOption
          title="Light"
          description="Bright background, dark text."
          selected={theme === 'light'}
          onPress={() => setTheme('light')}
          swatchStyle={styles.swatchLight}
          swatchTextStyle={{ color: '#0f172a' }}
          dotColor="#2563eb"
        />
        <ThemeOption
          title="Dark"
          description="Deep navy, easy on the eyes."
          selected={theme === 'dark'}
          onPress={() => setTheme('dark')}
          swatchStyle={styles.swatchDark}
          swatchTextStyle={{ color: '#e5e7eb' }}
          dotColor="#60a5fa"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function ThemeOption({
  title,
  description,
  selected,
  onPress,
  swatchStyle,
  swatchTextStyle,
  dotColor,
}: {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  swatchStyle: object;
  swatchTextStyle: object;
  dotColor: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.themeCard, selected && styles.themeCardSelected]}
    >
      <View style={[styles.swatch, swatchStyle]}>
        <Text style={[styles.swatchText, swatchTextStyle]}>Aa</Text>
        <View style={[styles.swatchDot, { backgroundColor: dotColor }]} />
      </View>
      <View style={styles.themeMeta}>
        <Text style={styles.themeTitle}>{title}</Text>
        <Text style={styles.themeDesc}>{description}</Text>
      </View>
      <View
        style={[
          styles.radio,
          selected && { borderColor: '#2563eb', backgroundColor: '#2563eb' },
        ]}
      >
        {selected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  heading: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subheading: { fontSize: 13, color: '#64748b', marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  hint: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fff',
  },
  bioInput: { minHeight: 90 },
  error: { color: '#b91c1c', backgroundColor: '#fee2e2', padding: 10, borderRadius: 8, marginBottom: 8 },
  success: { color: '#065f46', backgroundColor: '#d1fae5', padding: 10, borderRadius: 8, marginBottom: 8 },
  themeRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  themeCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  themeCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  swatch: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  swatchLight: { backgroundColor: '#ffffff', borderColor: '#e2e8f0' },
  swatchDark: { backgroundColor: '#0b1220', borderColor: '#334155' },
  swatchText: { fontSize: 14, fontWeight: '700' },
  swatchDot: { width: 12, height: 12, borderRadius: 6, marginLeft: 'auto' },
  themeMeta: { flexDirection: 'column' },
  themeTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  themeDesc: { fontSize: 12, color: '#64748b' },
  radio: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  saveBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
