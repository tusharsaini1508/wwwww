import React from "react";
import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
  accessibilityLabel?: string;
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent"
  },
  danger: {
    backgroundColor: theme.colors.danger,
    borderColor: theme.colors.danger
  }
};

const variantText: Record<ButtonVariant, TextStyle> = {
  primary: {
    color: "#FFFFFF"
  },
  secondary: {
    color: theme.colors.textPrimary
  },
  ghost: {
    color: theme.colors.accentDark
  },
  danger: {
    color: "#FFFFFF"
  }
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  md: {
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  lg: {
    paddingVertical: 12,
    paddingHorizontal: 20
  }
};

const sizeText: Record<ButtonSize, TextStyle> = {
  sm: {
    fontSize: 12
  },
  md: {
    fontSize: 13
  },
  lg: {
    fontSize: 14
  }
};

export const Button = ({
  label,
  onPress,
  disabled,
  variant = "primary",
  size = "md",
  style,
  textStyle,
  children,
  accessibilityLabel
}: ButtonProps) => {
  const content =
    children ??
    (label ? (
      <Text style={[styles.text, variantText[variant], sizeText[size], textStyle]}>
        {label}
      </Text>
    ) : null);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        variant === "ghost" && styles.noShadow,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style
      ]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.shadowStrong,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3
  },
  text: {
    fontFamily: theme.typography.body,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95
  },
  disabled: {
    opacity: 0.55,
    shadowOpacity: 0
  },
  noShadow: {
    shadowOpacity: 0,
    elevation: 0
  }
});
