import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

type TagProps = {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

const toneStyles = {
  default: "#F1F1EE",
  success: "#E3F3EA",
  warning: "#FBECDD",
  danger: "#FBE6E4",
  info: "#E3EEFB"
};

export const Tag = ({ label, tone = "default" }: TagProps) => {
  return (
    <View style={[styles.tag, { backgroundColor: toneStyles[tone] }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  text: {
    fontSize: 11,
    fontFamily: theme.typography.body,
    fontWeight: "600",
    color: theme.colors.ink,
    letterSpacing: 0.2
  }
});
