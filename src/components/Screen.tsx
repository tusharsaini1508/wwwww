import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { theme } from "../theme";

type ScreenProps = {
  children: React.ReactNode;
  padded?: boolean;
  scroll?: boolean;
};

export const Screen = ({ children, padded = true, scroll = true }: ScreenProps) => {
  return (
    <View style={styles.safe}>
      {scroll ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, padded && styles.padded]}
          showsVerticalScrollIndicator
          alwaysBounceVertical={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, padded && styles.padded]}>{children}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    minHeight: 0
  },
  scrollView: {
    flex: 1,
    minHeight: 0
  },
  
  content: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
    width: "100%",
    maxWidth: 1240,
    alignSelf: "center",
    minHeight: "100%"
  },
  padded: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg
  }
});
