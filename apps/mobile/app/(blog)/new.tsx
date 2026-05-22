import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { secureStorage } from '../../lib/secureStorage';
import { ImageUpload } from '../../components/ImageUpload';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const TABLET_BREAKPOINT = 700;
const FORM_MAX_WIDTH = 720;

// Mirror of apps/web/app/lib/slugify.ts so users can type Bulgarian titles
// and still get a valid `^[a-z0-9]+(?:-[a-z0-9]+)*$` slug.
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};

function slugify(input: string): string {
  const lower = input.toLowerCase().trim();
  let out = '';
  for (const ch of lower) out += CYRILLIC_MAP[ch] ?? ch;
  return out
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const textToHtml = (text: string) =>
  text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br />')}</p>`)
    .join('');

export default function NewPostScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const onSubmit = async () => {
    const finalSlug = slugify(slug || title);
    if (!title.trim() || !body.trim() || !finalSlug) {
      Alert.alert('Missing fields', 'Title, slug and content are required.');
      return;
    }
    setSaving(true);
    try {
      const token = await secureStorage.getItem('accessToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const res = await axios.post(
        `${API_URL}/api/posts`,
        {
          title: title.trim(),
          slug: finalSlug,
          excerpt: excerpt.trim() || undefined,
          contentHtml: textToHtml(body),
          tags,
          coverImageUrl: coverImageUrl || undefined,
          published,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const created = res.data.data;
      if (created?.slug) {
        router.replace(`/(blog)/${created.slug}`);
      } else {
        router.replace('/(blog)/my-posts');
      }
    } catch (e: any) {
      Alert.alert(
        'Create failed',
        e?.response?.data?.error || 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

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
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Write a new post</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={onTitleChange}
        placeholder="Post title"
      />

      <Text style={styles.label}>Slug</Text>
      <TextInput
        style={styles.input}
        value={slug}
        onChangeText={(t) => {
          setSlug(t);
          setSlugTouched(true);
        }}
        placeholder="my-first-post"
        autoCapitalize="none"
      />
      <Text style={styles.hint}>
        Lowercase letters, numbers and hyphens only.
      </Text>

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

      <ImageUpload
        value={coverImageUrl}
        onChange={setCoverImageUrl}
        disabled={saving}
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Publish immediately</Text>
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
          onPress={onSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>
              {published ? 'Publish' : 'Save draft'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 14,
  },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
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
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnGhost: { backgroundColor: '#f3f4f6' },
  btnGhostText: { color: '#374151', fontWeight: '600' },
});
