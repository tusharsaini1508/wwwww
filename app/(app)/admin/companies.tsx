import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { Card } from "../../../src/components/Card";
import { AccessDenied } from "../../../src/components/AccessDenied";
import { Tag } from "../../../src/components/Tag";
import { AdminTabs } from "../../../src/components/AdminTabs";
import { FormField } from "../../../src/components/FormField";
import { Button } from "../../../src/components/Button";
import { theme } from "../../../src/theme";
import { useAppStore } from "../../../src/store/useAppStore";
import { PERMISSIONS } from "../../../src/lib/permissions";
import { Company } from "../../../src/types";
import { useCurrentUser } from "../../../src/hooks/useCurrentUser";

const plans: Company["plan"][] = ["Starter", "Growth", "Enterprise"];
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

type ApiCompany = {
  id: string;
  name: string;
  plan: Company["plan"];
  active: boolean;
};

export default function CompaniesScreen() {
  const user = useCurrentUser();
  const companies = useAppStore((state) => state.companies);
  const users = useAppStore((state) => state.users);
  const authToken = useAppStore((state) => state.authToken);
  const companyOverrides = useAppStore((state) => state.companyOverrides);
  const createCompany = useAppStore((state) => state.createCompany);
  const updateCompany = useAppStore((state) => state.updateCompany);
  const setCompanyOverride = useAppStore((state) => state.setCompanyOverride);

  const [name, setName] = useState("");
  const [plan, setPlan] = useState<Company["plan"]>("Growth");
  const [error, setError] = useState("");
  const [remoteCompanies, setRemoteCompanies] = useState<ApiCompany[] | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [savingCompanyId, setSavingCompanyId] = useState<string | null>(null);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canCreate = Boolean(name.trim());

  const loadCompanies = async () => {
      if (!API_BASE_URL || !authToken) {
        setRemoteCompanies(null);
        return;
      }

      setLoadingRemote(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/companies`, {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        });
        if (!response.ok) {
          setRemoteCompanies(null);
          return;
        }
        const payload = (await response.json()) as { companies?: ApiCompany[] };
        setRemoteCompanies(payload.companies ?? []);
      } catch {
        setRemoteCompanies(null);
      } finally {
        setLoadingRemote(false);
      }
    };

  useEffect(() => {
    void loadCompanies();
  }, [authToken]);

  const apiMode = Boolean(API_BASE_URL && authToken && remoteCompanies !== null);

  const displayedCompanies: Array<ApiCompany | Company> = remoteCompanies ?? companies;

  const adminMap = useMemo(() => {
    const map = new Map<string, string[]>();
    users
      .filter((account) => account.role === "ADMIN")
      .forEach((account) => {
        const list = map.get(account.companyId) ?? [];
        list.push(account.email);
        map.set(account.companyId, list);
      });
    return map;
  }, [users]);

  if (!isSuperAdmin) {
    return (
      <Screen>
        <SectionHeader title="Company Access" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Company name is required.");
      return;
    }
    if (
      displayedCompanies.some(
        (company) => company.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setError("A company with this name already exists.");
      return;
    }
    if (apiMode) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/companies`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ name: trimmed, plan })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          setError(payload.message ?? "Unable to create company.");
          return;
        }

        setError("");
        setName("");
        setPlan("Growth");
        await loadCompanies();
        return;
      } catch {
        setError("Unable to reach backend API.");
        return;
      }
    }

    setError("");
    createCompany({ name: trimmed, active: true, plan });
    setName("");
    setPlan("Growth");
  };

  return (
    <Screen scroll={false}>
      <SectionHeader
        title="Company Access"
        subtitle="Create companies and control their feature entitlements."
      />
      {loadingRemote ? (
        <Text style={styles.remoteMeta}>Loading companies from backend...</Text>
      ) : remoteCompanies ? (
        <Text style={styles.remoteMeta}>Showing companies from backend API.</Text>
      ) : (
        <Text style={styles.remoteMeta}>Using local company data (API unavailable).</Text>
      )}
      <AdminTabs />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <FormField label="New company" error={error || undefined}>
            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (error) {
                  setError("");
                }
              }}
              placeholder="Company name"
              placeholderTextColor={theme.colors.inkSubtle}
              accessibilityLabel="Company name"
              style={styles.input}
            />
          </FormField>
          <Text style={styles.label}>Plan</Text>
          <View style={styles.planRow}>
            {plans.map((tier) => (
              <Pressable
                key={tier}
                onPress={() => setPlan(tier)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${tier} plan`}
                style={[styles.planChip, plan === tier && styles.planChipActive]}
              >
                <Text style={[styles.planText, plan === tier && styles.planTextActive]}>
                  {tier}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button
            label="Create company"
            onPress={handleCreate}
            disabled={!canCreate}
            accessibilityLabel="Create company"
          />
          {apiMode ? (
            <Text style={styles.readOnlyHint}>
              Company updates are being saved to backend API.
            </Text>
          ) : null}
        </Card>

        <View style={styles.stack}>
          {displayedCompanies.map((company) => {
            const admins = adminMap.get(company.id) ?? [];
            const companyPlan = "plan" in company ? company.plan : "Enterprise";
            return (
              <Card key={company.id}>
                <View style={styles.companyHeader}>
                  <View>
                    <Text style={styles.companyName}>{company.name}</Text>
                    <Text style={styles.companyMeta}>
                      Plan: {companyPlan} | {company.active ? "Active" : "Suspended"}
                    </Text>
                    <Text style={styles.companyMeta}>
                      Admins: {admins.length > 0 ? admins.join(", ") : "None"}
                    </Text>
                  </View>
                  <Tag label={companyPlan} tone="info" />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Company active</Text>
                  <Switch
                    value={company.active}
                    onValueChange={async (value) => {
                      if (apiMode) {
                        try {
                          setSavingCompanyId(company.id);
                          const response = await fetch(
                            `${API_BASE_URL}/api/companies/${company.id}`,
                            {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${authToken}`
                              },
                              body: JSON.stringify({ active: value })
                            }
                          );
                          if (response.ok) {
                            await loadCompanies();
                          }
                        } finally {
                          setSavingCompanyId(null);
                        }
                        return;
                      }

                      updateCompany(company.id, { active: value });
                    }}
                    disabled={savingCompanyId === company.id}
                  />
                </View>
                <View style={styles.permissionList}>
                  {PERMISSIONS.map((permission) => {
                    const allowed = companyOverrides[company.id]?.[permission] !== false;
                    return (
                      <View key={`${company.id}-${permission}`} style={styles.permissionRow}>
                        <View style={styles.permissionText}>
                          <Text style={styles.permissionLabel}>{permission}</Text>
                          <Text style={styles.permissionSub}>
                            Company limit: {allowed ? "Allowed" : "Restricted"}
                          </Text>
                        </View>
                        <Switch
                          value={allowed}
                          onValueChange={(value) =>
                            setCompanyOverride(company.id, permission, value)
                          }
                          disabled={apiMode}
                        />
                      </View>
                    );
                  })}
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  remoteMeta: {
    marginBottom: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  readOnlyHint: {
    marginTop: theme.spacing.sm,
    fontSize: 11,
    color: theme.colors.inkSubtle
  },
  scroll: {
    paddingBottom: theme.spacing.xl
  },
  card: {
    marginBottom: theme.spacing.lg
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.spacing.xs
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface
  },
  planRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  planChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  planChipActive: {
    borderColor: theme.colors.accentDark,
    backgroundColor: theme.colors.accentSoft
  },
  planText: {
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  planTextActive: {
    color: theme.colors.ink,
    fontWeight: "700"
  },
  stack: {
    gap: theme.spacing.md
  },
  companyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: theme.spacing.sm
  },
  companyName: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.ink
  },
  companyMeta: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.ink
  },
  permissionList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  permissionText: {
    flex: 1,
    marginRight: theme.spacing.md
  },
  permissionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.ink
  },
  permissionSub: {
    marginTop: 2,
    fontSize: 11,
    color: theme.colors.inkSubtle
  }
});
