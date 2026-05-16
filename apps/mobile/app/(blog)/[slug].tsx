import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, Stack } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type Post = {
  id: string;
  title: string;
  slug: string;
  contentHtml: string;
  excerpt: string | null;
  publishedAt: string | null;
  createdAt: string;
  tags: string[];
  author?: { name: string };
};

// very small HTML → plain text fallback (good enough for mobile demo)
const stripHtml = (html: string) =>
  html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

export default function BlogDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/posts/${slug}`);
        setPost(res.data.data);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Post not found'}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: post.title }} />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.meta}>
          {post.author?.name ?? 'Unknown'} •{' '}
          {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString()}
        </Text>
        {post.tags?.length > 0 && (
          <View style={styles.tagRow}>
            {post.tags.map((tag) => (
              <Text key={tag} style={styles.tag}>
                #{tag}
              </Text>
            ))}
          </View>
        )}
        <Text style={styles.body}>{stripHtml(post.contentHtml)}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: '#b91c1c' },
  title: { fontSize: 26, fontWeight: '800', color: '#111', marginBottom: 8 },
  meta: { fontSize: 13, color: '#888', marginBottom: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  tag: {
    fontSize: 12,
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  body: { fontSize: 16, lineHeight: 24, color: '#222' },
});
