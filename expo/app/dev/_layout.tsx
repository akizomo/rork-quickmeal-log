import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { ThemeProvider, lightTheme, darkTheme, useTheme } from '@/design-system';

type DevThemeMode = 'light' | 'dark';

/**
 * /dev 配下だけ、システムのcolorSchemeとは独立にlight/darkを強制切り替えできる
 * ようにする。design-system の ThemeProvider は theme prop を渡すと強制適用に
 * なる仕様 (ThemeProvider.tsx 参照) なので、ここでネストして上書きする。
 */
export default function DevLayout() {
  const [mode, setMode] = useState<DevThemeMode>('light');
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <Stack
        screenOptions={{
          headerRight: () => <DevThemeToggle mode={mode} onToggle={setMode} />,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Design System' }} />
      </Stack>
    </ThemeProvider>
  );
}

function DevThemeToggle({
  mode,
  onToggle,
}: {
  mode: DevThemeMode;
  onToggle: (m: DevThemeMode) => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => onToggle(mode === 'dark' ? 'light' : 'dark')}
      hitSlop={8}
      style={{
        paddingHorizontal: t.spacing['3'],
        paddingVertical: t.spacing['1'],
        borderRadius: t.radius.full,
        backgroundColor: t.colors.surface.raised,
        borderWidth: 1,
        borderColor: t.colors.border.default,
      }}
    >
      <Text style={{ color: t.colors.content.primary, fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.semibold }}>
        {mode === 'dark' ? '🌙 Dark' : '☀️ Light'}
      </Text>
    </Pressable>
  );
}
