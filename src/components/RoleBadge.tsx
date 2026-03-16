import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Role } from "../types";
import { theme } from "../theme";

const roleTone: Record<Role, string> = {
  SUPER_ADMIN: "#0F6D6A",
  ADMIN: "#1F7A48",
  MANAGER: "#2C7BE5",
  PLANNER: "#B05712",
  OPERATOR: "#4E4B47",
  VIEWER: "#7A756F"
};

export const RoleBadge = ({ role }: { role: Role }) => {
  return (
    <View style={[styles.badge, { backgroundColor: roleTone[role] }]}>
      <Text style={styles.text}>{role.replace("_", " ")}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)"
  },
  text: {
    fontSize: 11,
    fontFamily: theme.typography.body,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3
  }
});
