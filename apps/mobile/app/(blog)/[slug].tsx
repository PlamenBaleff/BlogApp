import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, Stack, useRouter, useFocusEffect } from 'expo-router';
import { secureStorage } from '../../lib/secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Cap the reading column on tablets so lines stay comfortably short.
const TABLET_BREAKPOINT = 700;
const READING_MAX_WIDTH = 720;

type Post = {
  id: string;
  title: string;
  slug: string;
  contentHtml: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  published: boolean;
  authorId: string;
  tags: string[];
  author?: { id?: string; name: string };
};

type Me = { id: string; name: string; email: string } | null;

// Cross-platform confirm dialog (Alert.alert has no buttons on web).
function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return Promise.resolve(false);
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

// very small HTML → plain text fallback (good enough for mobile demo)
const stripHtml = (html: string) =>
  html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

// Split HTML into a list of text and image segments so we can render inline
// <img> tags using React Native's <Image> component.
type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'image'; src: string; alt?: string };

const renderSegments = (html: string): Segment[] => {
  const imgRe = /<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
  const out: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const before = html.slice(last, m.index);
    const beforeText = stripHtml(before);
    if (beforeText) out.push({ kind: 'text', value: beforeText });
    const altMatch = /\balt=["']([^"']*)["']/i.exec(m[0]);
    out.push({ kind: 'image', src: m[1], alt: altMatch?.[1] });
    last = m.index + m[0].length;
  }
  const tail = stripHtml(html.slice(last));
  if (tail) out.push({ kind: 'text', value: tail });
  return out;
};

export default function BlogDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const [post, setPost] = useState<Post | null>(null);
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const userJson = await secureStorage.getItem('user');
      if (userJson) {
        try {
          setMe(JSON.parse(userJson));
        } catch {
          setMe(null);
        }
      }
    })();
  }, []);

  const fetchPost = useCallback(async () => {
    if (!slug) return;
    try {
      const token = await secureStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await axios.get(`${API_URL}/api/posts/${slug}`, { headers });
      setPost(res.data.data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // Refetch every time the screen regains focus so edits made on the edit
  // screen are visible immediately after navigating back.
  useFocusEffect(
    useCallback(() => {
      fetchPost();
    }, [fetchPost]),
  );

  const canEdit = !!(me && post && me.id === post.authorId);

  const onDelete = async () => {
    if (!post) return;
    const ok = await confirmAction(
      'Delete post',
      'Are you sure you want to delete this post? This cannot be undone.',
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const token = await secureStorage.getItem('accessToken');
      await axios.delete(`${API_URL}/api/posts/${post.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      router.replace('/(blog)');
    } catch (e: any) {
      Alert.alert('Delete failed', e?.response?.data?.error || 'Please try again.');
      setDeleting(false);
    }
  };

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          { padding: 20 },
          isTablet && { maxWidth: READING_MAX_WIDTH, alignSelf: 'center', width: '100%' },
        ]}
      >
        <Text style={[styles.title, isTablet && styles.titleTablet]}>{post.title}</Text>
        <Text style={styles.meta}>
          {post.author?.name ?? 'Unknown'} •{' '}
          {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString()}
          {!post.published ? '  ·  DRAFT' : ''}
        </Text>
        {post.coverImageUrl ? (
          <Image
            source={{ uri: post.coverImageUrl }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : null}
        {post.tags?.length > 0 && (
          <View style={styles.tagRow}>
            {post.tags.map((tag) => (
              <Text key={tag} style={styles.tag}>
                #{tag}
              </Text>
            ))}
          </View>
        )}

        {canEdit && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => router.push(`/(blog)/edit/${post.id}`)}
              disabled={deleting}
            >
              <Text style={styles.btnPrimaryText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={onDelete}
              disabled={deleting}
            >
              <Text style={styles.btnDangerText}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {renderSegments(post.contentHtml).map((seg, idx) =>
          seg.kind === 'text' ? (
            <Text
              key={`t-${idx}`}
              style={[styles.body, isTablet && styles.bodyTablet]}
            >
              {seg.value}
            </Text>
          ) : (
            <Image
              key={`i-${idx}`}
              source={{ uri: seg.src }}
              style={styles.inlineImage}
              resizeMode="contain"
              accessibilityLabel={seg.alt}
            />
          ),
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: '#b91c1c' },
  title: { fontSize: 26, fontWeight: '800', color: '#111', marginBottom: 8 },
  titleTablet: { fontSize: 34, marginBottom: 12 },
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
  bodyTablet: { fontSize: 18, lineHeight: 28 },
  cover: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#e2e8f0',
  },
  inlineImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginVertical: 12,
    backgroundColor: '#e2e8f0',
  },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnDanger: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dc2626' },
  btnDangerText: { color: '#dc2626', fontWeight: '600' },
});
