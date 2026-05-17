import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { secureStorage } from '../../../lib/secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type Post = {
  id: string;
  title: string;
  slug: string;
  contentHtml: string;
  excerpt: string | null;
  published: boolean;
  authorId: string;
  tags: string[];
};

const stripHtml = (html: string) =>
  html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

// Wrap a plain-text body back into minimal HTML so it round-trips through the
// API/DB (which expects `contentHtml`). Splits on blank lines into paragraphs.
const textToHtml = (text: string) =>
  text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br />')}</p>`)
    .join('');

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [published, setPublished] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const token = await secureStorage.getItem('accessToken');
        const res = await axios.get(`${API_URL}/api/posts/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const p: Post = res.data.data;
        setTitle(p.title);
        setExcerpt(p.excerpt ?? '');
        setBody(stripHtml(p.contentHtml));
        setTagsInput((p.tags ?? []).join(', '));
        setPublished(!!p.published);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onSave = async () => {
    if (!id) return;
    if (!title.trim() || !body.trim()) {
      Alert.alert('Missing fields', 'Title and content are required.');
      return;
    }
    setSaving(true);
    try {
      const token = await secureStorage.getItem('accessToken');
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await axios.patch(
        `${API_URL}/api/posts/${id}`,
        {
          title: title.trim(),
          excerpt: excerpt.trim() || undefined,
          contentHtml: textToHtml(body),
          tags,
          published,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.response?.data?.error || 'Please try again.');
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

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit post' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Post title"
        />

        <Text style={styles.label}>Excerpt</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={excerpt}
          onChangeText={setExcerpt}
          placeholder="Short summary (optional)"
          multiline
        />

        <Text style={styles.label}>Content</Text>
        <TextInput
          style={[styles.input, styles.body]}
          value={body}
          onChangeText={setBody}
          placeholder="Write your post here…"
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Tags (comma-separated)</Text>
        <TextInput
          style={styles.input}
          value={tagsInput}
          onChangeText={setTagsInput}
          placeholder="nextjs, drizzle, typescript"
          autoCapitalize="none"
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Published</Text>
          <Switch value={published} onValueChange={setPublished} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.btnGhostText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, saving && { opacity: 0.6 }]}
            onPress={onSave}
            disabled={saving}
          >
            <Text style={styles.btnPrimaryText}>
              {saving ? 'Saving…' : 'Save changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: '#b91c1c' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
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
  multiline: { minHeight: 60 },
  body: { minHeight: 200 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnGhost: { backgroundColor: '#f3f4f6' },
  btnGhostText: { color: '#374151', fontWeight: '600' },
});
