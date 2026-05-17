import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { secureStorage } from '../../lib/secureStorage';

export default function BlogLayout() {
  const router = useRouter();

  const logout = async () => {
    await secureStorage.removeItem('accessToken');
    await secureStorage.removeItem('refreshToken');
    await secureStorage.removeItem('user');
    router.replace('/(auth)/login');
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={{ paddingHorizontal: 12 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Logout</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'BlogHub' }} />
      <Stack.Screen name="[slug]" options={{ title: 'Post' }} />
      <Stack.Screen name="edit/[id]" options={{ title: 'Edit post' }} />
    </Stack>
  );
}
