import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

type Column<T> = {
  key: keyof T;
  label: string;
  width?: number;
  render?: (value: T[keyof T] | undefined, row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  summary?: string;
};

export const DataTable = <T extends { id: string }>({
  columns,
  rows,
  emptyMessage = "No records",
  summary
}: DataTableProps<T>) => {
  const defaultWidth = 140;
  const minTableWidth = columns.reduce(
    (total, col) => total + (col.width ?? defaultWidth),
    0
  );

  return (
    <View>
      {summary ? <Text style={styles.summary}>{summary}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.table, { minWidth: minTableWidth }]}>
        <View style={styles.headerRow}>
          {columns.map((col) => {
            const widthStyle = {
              minWidth: col.width ?? defaultWidth,
              flexGrow: 1,
              flexShrink: 0
            };
            return (
              <Text
                key={String(col.key)}
                style={[styles.headerCell, widthStyle]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {col.label}
              </Text>
            );
          })}
        </View>
        {rows.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No Data</Text>
            <Text style={styles.empty}>{emptyMessage}</Text>
          </View>
        ) : (
          rows.map((row, rowIndex) => (
            <View
              key={row.id}
              style={[styles.row, rowIndex % 2 === 1 && styles.rowAlt]}
            >
              {columns.map((col) => {
                const widthStyle = {
                  minWidth: col.width ?? defaultWidth,
                  flexGrow: 1,
                  flexShrink: 0
                };
                return (
                  <View key={String(col.key)} style={[styles.cell, widthStyle]}>
                    {col.render ? (
                      col.render(row[col.key], row)
                    ) : (
                      <Text
                        style={styles.cellText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {String(row[col.key] ?? "")}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))
        )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  table: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 2
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceMuted,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md
  },
  headerCell: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.typography.body,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  summary: {
    marginBottom: theme.spacing.sm,
    fontSize: 12,
    fontFamily: theme.typography.body,
    color: theme.colors.textSecondary
  },
  row: {
    flexDirection: "row",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  rowAlt: {
    backgroundColor: theme.colors.surfaceMuted
  },
  cell: {
    flex: 1,
    justifyContent: "center"
  },
  cellText: {
    fontSize: 13,
    fontFamily: theme.typography.body,
    color: theme.colors.textPrimary
  },
  emptyWrap: {
    padding: theme.spacing.md,
    alignItems: "flex-start"
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: theme.typography.body,
    fontWeight: "700",
    color: theme.colors.textPrimary
  },
  empty: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: theme.typography.body,
    color: theme.colors.textSecondary
  }
});
