import React from "react";
import { Image, ImageStyle, StyleSheet, View } from "react-native";
import { theme } from "../theme";

type LogoMarkProps = {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  textColor?: string;
};

const widthBySize = {
  sm: 190,
  md: 260,
  lg: 340
} as const;

const LOGO_ASPECT_RATIO = 1080 / 359;

export const LogoMark = ({
  size = "md",
  withWordmark = true
}: LogoMarkProps) => {
  const width = withWordmark ? widthBySize[size] : Math.round(widthBySize[size] * 0.24);
  const imageStyle: ImageStyle = {
    width,
    height: Math.round(width / LOGO_ASPECT_RATIO)
  };

  return (
    <View style={styles.wrap}>
      <Image
        source={require("../../logo.png")}
        style={imageStyle}
        resizeMode="contain"
        accessible
        accessibilityLabel="Mindbridge Innovations logo"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-start",
    justifyContent: "center",
    maxWidth: "100%",
    borderRadius: theme.radius.sm
  }
});
