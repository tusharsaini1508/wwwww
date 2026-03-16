import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useUiStore } from "../store/useUiStore";
import { theme } from "../theme";

const toneColor = {
  info: "#2C7BE5",
  success: "#1F7A48",
  warning: "#B05712",
  danger: "#B42318"
} as const;

export const AppToast = () => {
  const visible = useUiStore((state) => state.visible);
  const message = useUiStore((state) => state.message);
  const tone = useUiStore((state) => state.tone);
  const hideToast = useUiStore((state) => state.hideToast);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setTimeout(() => {
      hideToast();
    }, 2600);
    return () => clearTimeout(timer);
  }, [hideToast, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable
        onPress={hideToast}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        style={[styles.toast, { borderLeftColor: toneColor[tone] }]}
      >
        <Text style={styles.text}>{message}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: theme.spacing.lg,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: "center",
    pointerEvents: "box-none"
  },
  toast: {
    width: "92%",
    maxWidth: 520,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderLeftWidth: 5,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    shadowColor: theme.colors.shadowStrong,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6
  },
  text: {
    fontSize: 13,
    fontFamily: theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: "600"
  }
});
