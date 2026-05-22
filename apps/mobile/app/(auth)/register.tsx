import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import axios from 'axios';
import { secureStorage } from '../../lib/secureStorage';
import { useWebScrollIntoView } from '../../lib/useWebScrollIntoView';
import { Link, useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Cap the form on tablets / wide windows so inputs don't stretch.
const TABLET_BREAKPOINT = 600;
const FORM_MAX_WIDTH = 480;

export default function RegisterScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onFocusInput = useWebScrollIntoView();

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        password,
      });
      const { accessToken, refreshToken, user } = res.data.data;
      await secureStorage.setItem('accessToken', accessToken);
      await secureStorage.setItem('refreshToken', refreshToken);
      await secureStorage.setItem('user', JSON.stringify(user));
      router.replace('/(blog)');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.form, isTablet && { maxWidth: FORM_MAX_WIDTH, alignSelf: 'center', width: '100%' }]}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join BlogHub today</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
          editable={!loading}
          onFocus={onFocusInput}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
          onFocus={onFocusInput}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 chars)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
          onFocus={onFocusInput}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/login" style={styles.link}>
          Already have an account? Sign in
        </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 480,
  },
  form: { width: '100%' },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 4, color: '#111' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  link: { marginTop: 18, textAlign: 'center', color: '#2563eb', fontWeight: '600' },
});
