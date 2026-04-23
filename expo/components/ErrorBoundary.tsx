import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/theme';

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
        <View style={styles.container} testID="error-boundary">
          <View style={styles.card}>
            <Text style={styles.title}>画面の表示で問題が起きました</Text>
            <Text style={styles.text}>もう一度開き直してください。</Text>
            <Pressable onPress={this.handleReset} style={styles.button} testID="error-boundary-reset-button">
              <Text style={styles.buttonText}>再表示</Text>
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
    backgroundColor: palette.background,
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  title: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '700',
  },
  text: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: palette.sageDeep,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
