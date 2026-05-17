import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import axios from 'axios';
import { useRouter, useFocusEffect } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const PAGE_SIZE = 20;

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: string | null;
  createdAt: string;
  tags: string[];
  author?: { name: string };
};

export default function BlogListScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  // Switch to a 2-column grid on tablets / landscape phones.
  const numColumns = width >= 700 ? 2 : 1;

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(
    async (nextPage: number, mode: 'replace' | 'append') => {
      try {
        setError(null);
        const res = await axios.get(
          `${API_URL}/api/posts?published=true&limit=${PAGE_SIZE}&page=${nextPage}`,
        );
        const list: Post[] = res.data.data ?? [];
        setPages(res.data.pagination?.pages ?? 1);
        setPage(nextPage);
        setPosts((prev) => (mode === 'append' ? [...prev, ...list] : list));
      } catch (e: any) {
        setError(e?.message || 'Failed to load posts');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchPosts(1, 'replace');
  }, [fetchPosts]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts(1, 'replace');
    }, [fetchPosts]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(1, 'replace');
  };

  const onEndReached = () => {
    if (loadingMore || loading) return;
    if (page >= pages) return;
    setLoadingMore(true);
    fetchPosts(page + 1, 'append');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        // Re-mounting is required by FlatList when numColumns changes.
        key={`cols-${numColumns}`}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={posts.length === 0 ? styles.center : styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>No published posts yet.</Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#2563eb" />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, numColumns > 1 && styles.cardGrid]}
            onPress={() => router.push(`/(blog)/${item.slug}`)}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.excerpt && (
              <Text style={styles.cardExcerpt} numberOfLines={3}>
                {item.excerpt}
              </Text>
            )}
            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaText}>
                {item.author?.name ?? 'Unknown'}
              </Text>
              <Text style={styles.cardMetaText}>
                {new Date(item.publishedAt ?? item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {item.tags?.length > 0 && (
              <View style={styles.tagRow}>
                {item.tags.slice(0, 4).map((tag) => (
                  <Text key={tag} style={styles.tag}>
                    #{tag}
                  </Text>
                ))}
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  listContent: { padding: 12 },
  columnWrapper: { gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  empty: { color: '#666', fontSize: 16 },
  error: { color: '#b91c1c', padding: 12, textAlign: 'center' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardGrid: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: '#111' },
  cardExcerpt: { fontSize: 14, color: '#555', marginBottom: 8, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  cardMetaText: { fontSize: 12, color: '#888' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: {
    fontSize: 12,
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
