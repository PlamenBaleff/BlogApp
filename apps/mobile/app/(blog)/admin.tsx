import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import { secureStorage } from '../../lib/secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type Me = { id: string; role?: 'user' | 'admin' } | null;

type Stats = {
  users: number;
  posts: number;
  published: number;
  drafts: number;
} | null;

export default function AdminScreen() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [stats, setStats] = useState<Stats>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const userJson = await secureStorage.getItem('user');
    const token = await secureStorage.getItem('accessToken');
    if (!userJson || !token) {
      router.replace('/(auth)/login');
      return;
    }
    let parsed: Me = null;
    try {
      parsed = JSON.parse(userJson);
    } catch {
      /* ignore */
    }
    setMe(parsed);
    if (parsed?.role !== 'admin') {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      // Best-effort fetch of totals so the dashboard shows something useful.
      // Failures are non-fatal — the screen still renders with management links.
      const [postsAll, postsPub] = await Promise.all([
        axios.get(`${API_URL}/api/posts?published=false&limit=1&page=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/api/posts?published=true&limit=1&page=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const totalAll = postsAll.data?.pagination?.total ?? 0;
      const totalPub = postsPub.data?.pagination?.total ?? 0;
      setStats({
        users: 0,
        posts: totalAll,
        published: totalPub,
        drafts: Math.max(0, totalAll - totalPub),
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (me?.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>Admins only</Text>
        <Text style={styles.deniedText}>
          You don&apos;t have permission to view this page.
        </Text>
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => router.replace('/(blog)/home')}
        >
          <Text style={styles.linkBtnText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <Text style={styles.kicker}>BLOGHUB</Text>
      <Text style={styles.heading}>Admin dashboard</Text>
      <Text style={styles.subheading}>
        High-level overview and shortcuts. Full management lives in the web
        app — open it in a browser for table editing.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {stats && (
        <View style={styles.statsRow}>
          <StatCard label="Posts" value={stats.posts} />
          <StatCard label="Published" value={stats.published} />
          <StatCard label="Drafts" value={stats.drafts} />
        </View>
      )}

      <View style={styles.list}>
        <ActionRow
          title="Manage my posts"
          description="Drafts, published, edit & delete."
          onPress={() => router.push('/(blog)/my-posts')}
        />
        <ActionRow
          title="Write a new post"
          description="Create a draft or publish immediately."
          onPress={() => router.push('/(blog)/new')}
        />
        <ActionRow
          title="Browse the public blog"
          description="See what readers see on the feed."
          onPress={() => router.push('/(blog)')}
        />
        <ActionRow
          title="Open web admin (users)"
          description={`Use the web app at ${API_URL}/admin/users for full user management.`}
          onPress={() => router.push('/(blog)/home')}
          disabled
        />
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionRow({
  title,
  description,
  onPress,
  disabled,
}: {
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.action, disabled && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{description}</Text>
      </View>
      {!disabled && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  kicker: { color: '#7c3aed', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  heading: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  subheading: { fontSize: 14, color: '#475569', marginTop: 6, lineHeight: 20 },
  deniedTitle: { fontSize: 22, fontWeight: '800', color: '#dc2626', marginBottom: 6 },
  deniedText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 14 },
  linkBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  linkBtnText: { color: '#fff', fontWeight: '700' },
  error: { color: '#b91c1c', marginTop: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { marginTop: 22, gap: 10 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  actionDesc: { fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 16 },
  chevron: { fontSize: 24, color: '#94a3b8', marginLeft: 8 },
});
