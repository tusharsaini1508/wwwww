import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

type AccessDeniedProps = {
  title?: string;
  message?: string;
};

export const AccessDenied = ({
  title = "Access Limited",
  message = "Your role does not have permission to view this section."
}: AccessDeniedProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning
  },
  title: {
    fontSize: 16,
    fontFamily: theme.typography.heading,
    fontWeight: "700",
    color: theme.colors.ink
  },
  message: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: theme.typography.body,
    color: theme.colors.inkSubtle,
    lineHeight: 19
  }
});
