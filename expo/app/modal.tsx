import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/theme';

export default function AboutModalRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'About', presentation: 'modal' }} />
      <Modal animationType="fade" transparent visible onRequestClose={() => router.back()}>
        <Pressable style={styles.overlay} onPress={() => router.back()} testID="about-modal-overlay">
          <Pressable style={styles.card} onPress={() => undefined} testID="about-modal-card">
            <Text style={styles.eyebrow}>Hachibu</Text>
            <Text style={styles.title}>迷わず記録できる食事ログ</Text>
            <Text style={styles.description}>1タップ入力、Undo、再編集までを静かに気持ちよくまとめたMVPです。</Text>
            <Pressable style={styles.button} onPress={() => router.back()} testID="about-modal-close-button">
              <Text style={styles.buttonText}>閉じる</Text>
            </Pressable>
          </Pressable>
        </Pressable>
        <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(41, 46, 40, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surface,
    borderRadius: 28,
    padding: 24,
    gap: 14,
  },
  eyebrow: {
    color: palette.sageStrong,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  description: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  button: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: palette.sageDeep,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  buttonText: {
    color: palette.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
