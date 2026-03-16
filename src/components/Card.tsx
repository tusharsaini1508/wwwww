import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "../theme";

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export const Card = ({ children, style }: CardProps) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopWidth: 2,
    borderTopColor: theme.colors.accentSoft,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 3
  }
});
