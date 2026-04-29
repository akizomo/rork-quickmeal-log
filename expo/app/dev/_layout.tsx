import { Stack } from 'expo-router';
import React from 'react';

export default function DevLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Design System' }} />
      <Stack.Screen name="tokens" options={{ title: 'Tokens' }} />
      <Stack.Screen name="components" options={{ title: 'Components' }} />
    </Stack>
  );
}
