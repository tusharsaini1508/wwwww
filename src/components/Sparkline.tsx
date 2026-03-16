import React from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../theme";

type SparklineProps = {
  data: number[];
  height?: number;
  color?: string;
};

export const Sparkline = ({
  data,
  height = 60,
  color = theme.colors.accent
}: SparklineProps) => {
  const max = Math.max(...data, 1);
  return (
    <View style={[styles.container, { height }]}>
      {data.map((value, index) => {
        const barHeight = Math.max(6, (value / max) * height);
        return (
          <View
            key={`${index}-${value}`}
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: color
              }
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6
  },
  bar: {
    flex: 1,
    borderRadius: theme.radius.sm,
    minHeight: 8,
    opacity: 0.9
  }
});
