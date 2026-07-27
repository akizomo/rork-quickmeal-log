import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { lightTheme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.log('[error-boundary] Caught error', error);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.container, { backgroundColor: lightTheme.colors.surface.default }]} testID="error-boundary">
          <View style={[styles.card, { backgroundColor: lightTheme.colors.surface.raised }]}>
            <Text style={[styles.title, { color: lightTheme.colors.content.primary }]}>画面の表示で問題が起きました</Text>
            <Text style={[styles.text, { color: lightTheme.colors.content.secondary }]}>もう一度開き直してください。</Text>
            <Pressable onPress={this.handleReset} style={[styles.button, { backgroundColor: lightTheme.colors.action.primary.default }]} testID="error-boundary-reset-button">
              <Text style={[styles.buttonText, { color: lightTheme.colors.content.onAction }]}>再表示</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: fs['2xl'],
    fontWeight: '700',
  },
  text: {
    fontSize: fs.md,
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: fs.md,
    fontWeight: '700',
  },
});
