import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Keep console logging for debugging in dev and production.
    // eslint-disable-next-line no-console
    console.error("App render error:", error);
  }

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          Please refresh the page. If this keeps happening, contact support.
        </Text>
        <Text style={styles.details} selectable>
          {error.message}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    padding: theme.spacing.lg,
    justifyContent: "center"
  },
  title: {
    fontSize: 20,
    fontFamily: theme.typography.heading,
    fontWeight: "700",
    color: theme.colors.ink
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    fontFamily: theme.typography.body,
    color: theme.colors.inkSubtle
  },
  details: {
    marginTop: theme.spacing.md,
    fontSize: 12,
    fontFamily: theme.typography.mono,
    color: theme.colors.inkSoft
  }
});
