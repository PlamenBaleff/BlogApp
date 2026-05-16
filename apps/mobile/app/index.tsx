import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { secureStorage } from '../lib/secureStorage';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await secureStorage.getItem('accessToken');
      router.replace(token ? '/(blog)' : '/(auth)/login');
    })();
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
