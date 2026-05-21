import { Stack } from 'expo-router';
import { HeaderMenu } from '../../components/HeaderMenu';

export default function BlogLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => <HeaderMenu />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Blog' }} />
      <Stack.Screen name="home" options={{ title: 'Home' }} />
      <Stack.Screen name="my-posts" options={{ title: 'My posts' }} />
      <Stack.Screen name="new" options={{ title: 'New post' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="admin" options={{ title: 'Admin' }} />
      <Stack.Screen name="[slug]" options={{ title: 'Post' }} />
      <Stack.Screen name="edit/[id]" options={{ title: 'Edit post' }} />
    </Stack>
  );
}

