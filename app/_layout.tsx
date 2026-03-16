import React from "react";
import { Platform, Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { AppToast } from "../src/components/AppToast";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { theme } from "../src/theme";

const defaultTextStyle = { fontFamily: theme.typography.body, color: theme.colors.textPrimary };
const defaultInputStyle = { fontFamily: theme.typography.body, color: theme.colors.textPrimary };

const TextWithDefaults =
  Text as typeof Text & { defaultProps?: { style?: unknown } };
const TextInputWithDefaults =
  TextInput as typeof TextInput & {
    defaultProps?: { style?: unknown; placeholderTextColor?: string };
  };

if (Platform.OS !== "web") {
  if (!TextWithDefaults.defaultProps) {
    TextWithDefaults.defaultProps = {};
  }
  TextWithDefaults.defaultProps.style = [
    defaultTextStyle,
    TextWithDefaults.defaultProps.style
  ];

  if (!TextInputWithDefaults.defaultProps) {
    TextInputWithDefaults.defaultProps = {};
  }
  if (!TextInputWithDefaults.defaultProps.placeholderTextColor) {
    TextInputWithDefaults.defaultProps.placeholderTextColor = theme.colors.inkSoft;
  }
  TextInputWithDefaults.defaultProps.style = [
    defaultInputStyle,
    TextInputWithDefaults.defaultProps.style
  ];
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }} />
        <AppToast />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
