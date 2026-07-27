import { Stack } from 'expo-router';
import React from 'react';

export default function DevLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Design System' }} />
    </Stack>
  );
}
