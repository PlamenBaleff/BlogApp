import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { secureStorage } from '../../lib/secureStorage';

type Me = { id: string; name: string; email: string; role?: 'user' | 'admin' } | null;

export default function HomeScreen() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    (async () => {
      const json = await secureStorage.getItem('user');
      if (!json) return;
      try {
        setMe(JSON.parse(json));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>BlogHub</Text>
      <Text style={styles.title}>
        Welcome{me ? `, ${me.name}` : ''} 👋
      </Text>
      <Text style={styles.subtitle}>
        A modern full-stack blog built with Next.js, Expo, Drizzle ORM and Neon
        PostgreSQL. Browse published posts, write your own, and manage your
        profile.
      </Text>

      <View style={styles.grid}>
        <Tile
          title="Browse the blog"
          description="Read the latest published posts from the community."
          onPress={() => router.push('/(blog)')}
        />
        <Tile
          title="My posts"
          description="See and manage everything you've written, including drafts."
          onPress={() => router.push('/(blog)/my-posts')}
        />
        <Tile
          title="Write a new post"
          description="Publish a new entry or save it as a draft for later."
          onPress={() => router.push('/(blog)/new')}
        />
        <Tile
          title="Profile & theme"
          description="Update your name, bio, avatar and switch between light and dark."
          onPress={() => router.push('/(blog)/profile')}
        />
      </View>
    </ScrollView>
  );
}

function Tile({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileDesc}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  content: { padding: 20, paddingBottom: 40 },
  kicker: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#475569', marginTop: 8, lineHeight: 22 },
  grid: { marginTop: 22, gap: 12 },
  tile: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tileTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  tileDesc: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 18 },
});
