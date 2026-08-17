import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeContext } from '@/design-system/theme/ThemeProvider';
import type { Theme } from '@/design-system';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';

interface Props {
  title?: string;
  message?: string;
  retryLabel?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<Props>, State> {
  // contextType でテーマを直接取得する。ThemeProvider が壊れていても
  // createContext のデフォルト値 (lightTheme) にフォールバックするため安全。
  static contextType = ThemeContext;

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
      const t = this.context as Theme;
      const { title = 'Something went wrong', message = 'Please reopen the screen.', retryLabel = 'Reload' } = this.props;
      return (
        <View style={[styles.container, { backgroundColor: t.colors.surface.default }]} testID="error-boundary">
          <View style={[styles.card, { backgroundColor: t.colors.surface.raised }]}>
            <Text style={[styles.title, { color: t.colors.content.primary }]}>{title}</Text>
            <Text style={[styles.text, { color: t.colors.content.secondary }]}>{message}</Text>
            <Pressable onPress={this.handleReset} style={[styles.button, { backgroundColor: t.colors.action.primary.default }]} testID="error-boundary-reset-button">
              <Text style={[styles.buttonText, { color: t.colors.content.onAction }]}>{retryLabel}</Text>
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
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: fs.md,
    fontWeight: '700',
  },
});
