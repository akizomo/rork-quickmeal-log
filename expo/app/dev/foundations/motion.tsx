/**
 * Motion (duration / easing / spring) — 実際に再生して比較できる。DEV 専用。
 * 行をタップすると再生される。
 */

import { Stack } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { Label, tokens, useTheme, type Theme } from '@/design-system';
import { Section, labelStyle } from '../_shared';

export default function MotionScreen() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Motion' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        <MotionScale t={t} />
      </ScrollView>
    </>
  );
}

const TRACK_WIDTH = 240;
const DOT_SIZE = 20;

function MotionScale({ t }: { t: Theme }) {
  const durations = Object.entries(tokens.duration) as [string, number][];
  const easings = Object.entries(tokens.easing) as [string, readonly [number, number, number, number]][];
  const springs = Object.entries(tokens.spring) as [string, { tension: number; friction: number }][];

  return (
    <Section title="Motion — duration / easing / spring" t={t}>
      <View style={{ gap: t.spacing['2'] }}>
        <Text style={labelStyle(t)}>duration (ms) — 一定の easing.standard で再生し長さの違いを比較</Text>
        {durations.map(([k, v]) => (
          <PlayableRow key={k} t={t} label={`${k} (${v}ms)`} duration={v} curve={tokens.easing.standard} />
        ))}
      </View>

      <View style={{ gap: t.spacing['2'] }}>
        <Text style={labelStyle(t)}>easing — duration.medium(300ms) 固定でカーブの違いを比較</Text>
        {easings.map(([k, v]) => (
          <PlayableRow key={k} t={t} label={k} duration={tokens.duration.medium} curve={v} />
        ))}
      </View>

      <View style={{ gap: t.spacing['2'] }}>
        <Text style={labelStyle(t)}>spring — tension / friction</Text>
        {springs.map(([k, v]) => (
          <PlayableSpringRow key={k} t={t} label={`${k} (tension:${v.tension} / friction:${v.friction})`} spring={v} />
        ))}
      </View>
    </Section>
  );
}

/** duration/easing を1回再生して、track 上をドットが左→右に走るのを見せる。 */
function PlayableRow({
  t,
  label,
  duration,
  curve,
}: {
  t: Theme;
  label: string;
  duration: number;
  curve: readonly [number, number, number, number];
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [playing, setPlaying] = useState(false);

  const play = () => {
    if (playing) return;
    setPlaying(true);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.bezier(...curve),
      useNativeDriver: true,
    }).start(() => setPlaying(false));
  };

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_WIDTH - DOT_SIZE],
  });

  return (
    <Pressable
      onPress={play}
      style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing['3'] }}
    >
      <Label size="sm" tone="secondary" style={{ width: 150 }}>
        {label}
      </Label>
      <View
        style={{
          width: TRACK_WIDTH,
          height: DOT_SIZE,
          borderRadius: t.radius.full,
          backgroundColor: t.colors.surface.sunken,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: t.radius.full,
            backgroundColor: t.colors.action.primary.default,
            transform: [{ translateX }],
          }}
        />
      </View>
    </Pressable>
  );
}

/** spring を1回再生。 */
function PlayableSpringRow({
  t,
  label,
  spring,
}: {
  t: Theme;
  label: string;
  spring: { tension: number; friction: number };
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [playing, setPlaying] = useState(false);

  const play = () => {
    if (playing) return;
    setPlaying(true);
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      ...spring,
      useNativeDriver: true,
    }).start(() => setPlaying(false));
  };

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_WIDTH - DOT_SIZE],
  });

  return (
    <Pressable
      onPress={play}
      style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing['3'] }}
    >
      <Label size="sm" tone="secondary" style={{ width: 220 }}>
        {label}
      </Label>
      <View
        style={{
          width: TRACK_WIDTH,
          height: DOT_SIZE,
          borderRadius: t.radius.full,
          backgroundColor: t.colors.surface.sunken,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: t.radius.full,
            backgroundColor: t.colors.accent.default,
            transform: [{ translateX }],
          }}
        />
      </View>
    </Pressable>
  );
}
