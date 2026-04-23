import { Stack } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { palette } from '@/constants/theme';
import { useAppState } from '@/providers/app-state-provider';

export default function SettingsRoute() {
  const { settings, updateSettingsValues } = useAppState();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.text,
        }}
      />
      <ScrollView style={styles.page} contentContainerStyle={styles.content} testID="settings-screen">
        <View style={styles.card}>
          <Text style={styles.title}>Quiet Nutrition</Text>
          <Text style={styles.description}>Home中心のMVPなので、設定は必要最小限にしています。</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Haptics</Text>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(value) => updateSettingsValues({ hapticsEnabled: value })}
              testID="settings-haptics-switch"
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Sound</Text>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(value) => updateSettingsValues({ soundEnabled: value })}
              testID="settings-sound-switch"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>この先の拡張</Text>
          <Text style={styles.description}>プロフィール編集や体重入力は次フェーズで強化できます。</Text>
          <Pressable style={styles.secondaryButton} testID="settings-done-button">
            <Text style={styles.secondaryButtonText}>このままでOK</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 28,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.text,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.text,
  },
  secondaryButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: palette.card,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
