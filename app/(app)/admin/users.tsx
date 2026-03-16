import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { Card } from "../../../src/components/Card";
import { AccessDenied } from "../../../src/components/AccessDenied";
import { RoleBadge } from "../../../src/components/RoleBadge";
import { AdminTabs } from "../../../src/components/AdminTabs";
import { FormField } from "../../../src/components/FormField";
import { Button } from "../../../src/components/Button";
import { theme } from "../../../src/theme";
import { useAppStore } from "../../../src/store/useAppStore";
import { Role } from "../../../src/types";
import { useCan, useCurrentUser } from "../../../src/hooks/useCurrentUser";

const roles: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "PLANNER", "OPERATOR", "VIEWER"];
const superAdminVisibleRoles: Role[] = ["ADMIN"];

export default function UsersScreen() {
  const canManage = useCan("users.manage");
  const currentUser = useCurrentUser();
  const users = useAppStore((state) => state.users);
  const createUser = useAppStore((state) => state.createUser);
  const updateUser = useAppStore((state) => state.updateUser);
  const companies = useAppStore((state) => state.companies);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("OPERATOR");
  const [createError, setCreateError] = useState("");
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const defaultCompanyId = currentUser?.companyId ?? companies[0]?.id ?? "";
  const [companyId, setCompanyId] = useState(defaultCompanyId);

  useEffect(() => {
    if (!companyId && defaultCompanyId) {
      setCompanyId(defaultCompanyId);
    }
  }, [companyId, defaultCompanyId]);

  const assignableRoles = useMemo(() => {
    if (isSuperAdmin) {
      return superAdminVisibleRoles;
    }
    return roles.filter((r) => r !== "SUPER_ADMIN" && r !== "ADMIN");
  }, [isSuperAdmin]);

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies]
  );

  const visibleUsers = useMemo(() => {
    if (isSuperAdmin) {
      return users.filter((user) => superAdminVisibleRoles.includes(user.role));
    }
    return users.filter((user) => user.companyId === currentUser?.companyId);
  }, [currentUser?.companyId, isSuperAdmin, users]);

  const sortedUsers = useMemo(
    () =>
      [...visibleUsers].sort((a, b) =>
        a.role === b.role ? a.name.localeCompare(b.name) : a.role.localeCompare(b.role)
      ),
    [visibleUsers]
  );
  const canCreate = Boolean(
    name.trim() && email.trim() && password && (isSuperAdmin ? companyId : currentUser?.companyId)
  );

  if (!canManage) {
    return (
      <Screen>
        <SectionHeader title="User Management" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  const handleCreate = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim() || !normalizedEmail || !password) {
      setCreateError("Name, email, and password are required.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      setCreateError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setCreateError("Password must be at least 6 characters.");
      return;
    }
    if (users.some((user) => user.email.trim().toLowerCase() === normalizedEmail)) {
      setCreateError("An account with this email already exists.");
      return;
    }
    setCreateError("");
    const safeRole = assignableRoles.includes(role)
      ? role
      : assignableRoles[0] ?? "OPERATOR";
    const targetCompanyId = isSuperAdmin ? companyId : currentUser?.companyId;
    if (!targetCompanyId) {
      setCreateError("Select a company for this user.");
      return;
    }
    createUser({
      name: name.trim(),
      email: email.trim(),
      password,
      companyId: targetCompanyId,
      role: safeRole,
      active: true
    });
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <Screen>
      <SectionHeader
        title="User Management"
        subtitle="Create accounts, assign roles, and manage access."
      />
      <AdminTabs />
      <Card style={styles.card}>
        <FormField label="Full name" error={createError ? " " : undefined}>
          <TextInput
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (createError) {
                setCreateError("");
              }
            }}
            placeholder="Full name"
            placeholderTextColor={theme.colors.inkSubtle}
            accessibilityLabel="Full name"
            style={styles.input}
          />
        </FormField>
        <FormField label="Email">
          <TextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (createError) {
                setCreateError("");
              }
            }}
            placeholder="Email address"
            placeholderTextColor={theme.colors.inkSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            accessibilityLabel="Email address"
            style={styles.input}
          />
        </FormField>
        <FormField label="Temporary password" error={createError || undefined}>
          <TextInput
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (createError) {
                setCreateError("");
              }
            }}
            placeholder="Temporary password"
            placeholderTextColor={theme.colors.inkSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            accessibilityLabel="Temporary password"
            style={styles.input}
          />
        </FormField>
        {isSuperAdmin ? (
          <>
            <Text style={styles.label}>Company</Text>
            <View style={styles.roleRow}>
              {companies.map((company) => (
                <Pressable
                  key={company.id}
                  onPress={() => setCompanyId(company.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select company ${company.name}`}
                  style={[
                    styles.roleChip,
                    companyId === company.id && styles.roleChipActive
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      companyId === company.id && styles.roleTextActive
                    ]}
                  >
                    {company.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.companyNote}>
            Company: {companyMap.get(currentUser?.companyId ?? "")?.name ?? "Unknown"}
          </Text>
        )}
        <Text style={styles.label}>Role</Text>
        <View style={styles.roleRow}>
          {assignableRoles.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              accessibilityRole="button"
              accessibilityLabel={`Select role ${r.replace("_", " ")}`}
              style={[styles.roleChip, role === r && styles.roleChipActive]}
            >
              <Text
                style={[styles.roleText, role === r && styles.roleTextActive]}
              >
                {r.replace("_", " ")}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button
          label="Create user"
          onPress={handleCreate}
          disabled={!canCreate}
          accessibilityLabel="Create user"
        />
      </Card>

      <SectionHeader title="Active Users" subtitle="Tap to toggle status or adjust role." />
      <View style={styles.stack}>
        {sortedUsers.map((user) => (
          <Card key={user.id}>
            <View style={styles.userRow}>
              <View>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userCompany}>
                  Company: {companyMap.get(user.companyId)?.name ?? "Unknown"}
                </Text>
              </View>
              <RoleBadge role={user.role} />
            </View>
            <View style={styles.actions}>
              <View style={styles.passwordRow}>
                <TextInput
                  value={passwordDrafts[user.id] ?? ""}
                  onChangeText={(value) =>
                    setPasswordDrafts((prev) => ({ ...prev, [user.id]: value }))
                  }
                  placeholder="New password"
                  placeholderTextColor={theme.colors.inkSubtle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  style={styles.passwordInput}
                />
                <Pressable
                  onPress={() => {
                    const nextPassword = (passwordDrafts[user.id] ?? "").trim();
                    if (!nextPassword) {
                      return;
                    }
                    updateUser(user.id, { password: nextPassword });
                    setPasswordDrafts((prev) => ({ ...prev, [user.id]: "" }));
                  }}
                  disabled={
                    ((user.role === "SUPER_ADMIN" || user.role === "ADMIN") &&
                      !isSuperAdmin) ||
                    !(passwordDrafts[user.id] ?? "").trim()
                  }
                  style={[
                    styles.secondaryButton,
                    styles.passwordButton,
                    !(passwordDrafts[user.id] ?? "").trim() && styles.disabledButton,
                    (user.role === "SUPER_ADMIN" || user.role === "ADMIN") &&
                      !isSuperAdmin &&
                      styles.disabledButton
                  ]}
                >
                  <Text style={styles.secondaryText}>Update password</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => updateUser(user.id, { active: !user.active })}
                disabled={
                  (user.role === "SUPER_ADMIN" || user.role === "ADMIN") &&
                  !isSuperAdmin
                }
                style={[
                  styles.secondaryButton,
                  !user.active && styles.secondaryButtonMuted,
                  (user.role === "SUPER_ADMIN" || user.role === "ADMIN") &&
                    !isSuperAdmin &&
                    styles.disabledButton
                ]}
              >
                <Text style={styles.secondaryText}>
                  {user.active ? "Deactivate" : "Activate"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const rotationPool = isSuperAdmin ? superAdminVisibleRoles : assignableRoles;
                  const nextRole =
                    rotationPool[
                      (rotationPool.indexOf(user.role) + 1) % rotationPool.length
                    ] ?? user.role;
                  updateUser(user.id, { role: nextRole });
                }}
                disabled={
                  ((user.role === "SUPER_ADMIN" || user.role === "ADMIN") &&
                    !isSuperAdmin) ||
                  isSuperAdmin
                }
                style={[
                  styles.secondaryButton,
                  (((user.role === "SUPER_ADMIN" || user.role === "ADMIN") &&
                    !isSuperAdmin) ||
                    isSuperAdmin) &&
                    styles.disabledButton
                ]}
              >
                <Text style={styles.secondaryText}>Rotate role</Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  companyNote: {
    marginBottom: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  roleChipActive: {
    borderColor: theme.colors.accentDark,
    backgroundColor: theme.colors.accentSoft
  },
  roleText: {
    fontSize: 11,
    color: theme.colors.inkSubtle
  },
  roleTextActive: {
    color: theme.colors.ink,
    fontWeight: "700"
  },
  stack: {
    gap: theme.spacing.md
  },
  userRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: theme.spacing.sm
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink
  },
  userEmail: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  userCompany: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    flexWrap: "wrap",
    alignItems: "center"
  },
  passwordRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    minWidth: 220
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    fontSize: 12,
    backgroundColor: theme.colors.surface
  },
  passwordButton: {
    paddingHorizontal: 10
  },
  secondaryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  disabledButton: {
    opacity: 0.5
  },
  secondaryButtonMuted: {
    backgroundColor: theme.colors.surfaceMuted
  },
  secondaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.ink
  }
});
