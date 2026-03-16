import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
};

export const StatCard = ({ label, value, delta }: StatCardProps) => {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {delta ? <Text style={styles.delta}>{delta}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 160,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopWidth: 3,
    borderTopColor: theme.colors.accentSoft
  },
  label: {
    fontSize: 12,
    fontFamily: theme.typography.body,
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.9
  },
  value: {
    marginTop: theme.spacing.sm,
    fontSize: 24,
    fontFamily: theme.typography.heading,
    fontWeight: "700",
    color: theme.colors.ink
  },
  delta: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: theme.typography.body,
    color: theme.colors.accentDark
  }
});
