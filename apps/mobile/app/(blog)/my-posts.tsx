import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import { secureStorage } from '../../lib/secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  tags: string[];
};

export default function MyPostsScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setError(null);
      const token = await secureStorage.getItem('accessToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      const res = await axios.get(
        `${API_URL}/api/posts?mine=true&limit=100&page=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPosts(res.data.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>My posts</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(blog)/new')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          posts.length === 0 ? styles.emptyWrap : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPosts();
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            You haven&apos;t written any posts yet. Tap “+ New” to start.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(blog)/${item.slug}`)}
          >
            {item.coverImageUrl ? (
              <Image
                source={{ uri: item.coverImageUrl }}
                style={styles.cover}
                resizeMode="cover"
              />
            ) : null}
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text
                style={[
                  styles.badge,
                  item.published ? styles.badgePub : styles.badgeDraft,
                ]}
              >
                {item.published ? 'PUBLISHED' : 'DRAFT'}
              </Text>
            </View>
            {item.excerpt && (
              <Text style={styles.cardExcerpt} numberOfLines={2}>
                {item.excerpt}
              </Text>
            )}
            <View style={styles.cardFooter}>
              <Text style={styles.cardMetaText}>
                {new Date(item.publishedAt ?? item.createdAt).toLocaleDateString()}
              </Text>
              <TouchableOpacity
                onPress={() => router.push(`/(blog)/edit/${item.id}`)}
              >
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heading: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  newBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newBtnText: { color: '#fff', fontWeight: '700' },
  list: { padding: 12 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  empty: { color: '#64748b', fontSize: 15, textAlign: 'center' },
  error: { color: '#b91c1c', padding: 12, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: 130,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#e2e8f0',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111', flex: 1 },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
  badgePub: { color: '#065f46', backgroundColor: '#d1fae5' },
  badgeDraft: { color: '#78350f', backgroundColor: '#fef3c7' },
  cardExcerpt: { fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cardMetaText: { fontSize: 12, color: '#94a3b8' },
  editLink: { fontSize: 13, color: '#2563eb', fontWeight: '700' },
});
