import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { theme } from "../theme";

type FormFieldProps = {
  label: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

export const FormField = ({ label, helper, error, children, style }: FormFieldProps) => {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontFamily: theme.typography.body,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6
  },
  helper: {
    marginBottom: 6,
    fontSize: 12,
    fontFamily: theme.typography.body,
    color: theme.colors.textMuted
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: theme.typography.body,
    color: theme.colors.danger
  }
});
