import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { Card } from "../../../src/components/Card";
import { AccessDenied } from "../../../src/components/AccessDenied";
import { AdminTabs } from "../../../src/components/AdminTabs";
import { theme } from "../../../src/theme";
import { useAppStore } from "../../../src/store/useAppStore";
import { useCan } from "../../../src/hooks/useCurrentUser";

export default function AuditScreen() {
  const canView = useCan("audit.view");
  const audit = useAppStore((state) => state.audit);

  if (!canView) {
    return (
      <Screen>
        <SectionHeader title="Audit Log" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader
        title="Audit Log"
        subtitle="Immutable trace of critical system actions."
      />
      <AdminTabs />
      <View style={styles.stack}>
        {audit.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No audit events yet.</Text>
          </Card>
        ) : (
          audit.map((event) => (
            <Card key={event.id}>
              <Text style={styles.action}>{event.action}</Text>
              <Text style={styles.entity}>{event.entity}</Text>
              <Text style={styles.meta}>
                {event.actor} - {event.createdAt}
              </Text>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: theme.spacing.md
  },
  action: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink
  },
  entity: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  meta: {
    marginTop: 6,
    fontSize: 11,
    color: theme.colors.inkSubtle
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.inkSubtle
  }
});
