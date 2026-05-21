import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { secureStorage } from '../lib/secureStorage';

type Me = {
  id: string;
  email: string;
  name: string;
  role?: 'user' | 'admin';
  theme?: 'light' | 'dark';
} | null;

interface MenuItem {
  label: string;
  href: string;
  adminOnly?: boolean;
}

const ITEMS: MenuItem[] = [
  { label: 'Home', href: '/(blog)/home' },
  { label: 'Blog', href: '/(blog)' },
  { label: 'My Posts', href: '/(blog)/my-posts' },
  { label: 'New', href: '/(blog)/new' },
  { label: 'Profile', href: '/(blog)/profile' },
  { label: 'Admin', href: '/(blog)/admin', adminOnly: true },
];

/**
 * Hamburger-button + slide-down modal menu rendered in the (blog) stack
 * header. Mirrors the web NavBar links: Home, Blog, My Posts, New, Profile,
 * Admin (admins only), plus Logout.
 */
export function HeaderMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const json = await secureStorage.getItem('user');
      if (cancelled) return;
      if (!json) {
        setMe(null);
        return;
      }
      try {
        setMe(JSON.parse(json) as Me);
      } catch {
        setMe(null);
      }
    };
    load();
    // Re-read user whenever the menu opens (role/profile may have changed).
    return () => {
      cancelled = true;
    };
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    // expo-router types accept the literal href strings declared above.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(href as any);
  };

  const logout = async () => {
    setOpen(false);
    await secureStorage.removeItem('accessToken');
    await secureStorage.removeItem('refreshToken');
    await secureStorage.removeItem('user');
    router.replace('/(auth)/login');
  };

  const visible = ITEMS.filter((i) => !i.adminOnly || me?.role === 'admin');

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={styles.hamburger}
        accessibilityLabel="Open menu"
        accessibilityRole="button"
      >
        <View style={styles.bar} />
        <View style={styles.bar} />
        <View style={styles.bar} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            {me && (
              <View style={styles.userRow}>
                <Text style={styles.userName}>{me.name}</Text>
                <Text style={styles.userEmail}>{me.email}</Text>
                {me.role === 'admin' && (
                  <Text style={styles.badge}>ADMIN</Text>
                )}
              </View>
            )}
            {visible.map((item) => (
              <TouchableOpacity
                key={item.href}
                style={styles.item}
                onPress={() => go(item.href)}
              >
                <Text
                  style={[
                    styles.itemText,
                    item.adminOnly && styles.itemAdmin,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.separator} />
            <TouchableOpacity style={styles.item} onPress={logout}>
              <Text style={[styles.itemText, styles.itemDanger]}>Logout</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hamburger: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    gap: 4,
  },
  bar: { width: 22, height: 2, backgroundColor: '#fff', borderRadius: 2 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingTop: Platform.OS === 'ios' ? 96 : 64,
    paddingHorizontal: 16,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  userRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  userName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  userEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  item: { paddingHorizontal: 16, paddingVertical: 12 },
  itemText: { fontSize: 16, color: '#0f172a', fontWeight: '500' },
  itemAdmin: { color: '#7c3aed', fontWeight: '700' },
  itemDanger: { color: '#dc2626', fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
});
