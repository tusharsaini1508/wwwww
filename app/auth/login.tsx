import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { FormField } from "../../src/components/FormField";
import { Button } from "../../src/components/Button";
import { theme } from "../../src/theme";
import { useAppStore } from "../../src/store/useAppStore";
import { useUiStore } from "../../src/store/useUiStore";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const normalizeEmail = (value: string) => value.trim().toLowerCase();

export default function LoginScreen() {
  const users = useAppStore((state) => state.users);
  const companies = useAppStore((state) => state.companies);
  const loginAs = useAppStore((state) => state.loginAs);
  const bootstrapSuperAdmin = useAppStore((state) => state.bootstrapSuperAdmin);
  const showToast = useUiStore((state) => state.showToast);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupError, setSetupError] = useState("");

  const isFirstRun = users.length === 0;

  const usersByEmail = useMemo(() => {
    const map = new Map<string, (typeof users)[number]>();
    users.forEach((user) => {
      map.set(normalizeEmail(user.email), user);
    });
    return map;
  }, [users]);

  const companiesById = useMemo(() => {
    const map = new Map<string, (typeof companies)[number]>();
    companies.forEach((company) => {
      map.set(company.id, company);
    });
    return map;
  }, [companies]);

  const canSubmit = useMemo(
    () => normalizeEmail(email).length > 0 && password.length > 0,
    [email, password]
  );

  const canSetup = useMemo(() => {
    return (
      companyName.trim().length > 0 &&
      adminName.trim().length > 0 &&
      normalizeEmail(setupEmail).length > 0 &&
      setupPassword.length >= 8
    );
  }, [adminName, companyName, setupEmail, setupPassword]);

  const handleLogin = () => {
    const normalizedEmail = normalizeEmail(email);
    let nextEmailError = "";
    let nextPasswordError = "";

    if (!normalizedEmail) {
      nextEmailError = "Email is required.";
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      nextEmailError = "Enter a valid email address.";
    }

    if (!password) {
      nextPasswordError = "Password is required.";
    }

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError("");

    if (nextEmailError || nextPasswordError) {
      showToast(nextEmailError || nextPasswordError, "warning");
      return;
    }

    const matchedUser = usersByEmail.get(normalizedEmail);
    if (!matchedUser || matchedUser.password !== password) {
      setFormError("Invalid email or password.");
      showToast("Invalid email or password.", "danger");
      return;
    }
    const company = companiesById.get(matchedUser.companyId);
    if (company && !company.active) {
      setFormError("This company is suspended. Contact your administrator.");
      showToast("Company is suspended. Contact your administrator.", "warning");
      return;
    }
    if (!matchedUser.active) {
      setFormError("This account is inactive. Contact your administrator.");
      showToast("This account is inactive.", "warning");
      return;
    }
    setEmailError("");
    setPasswordError("");
    setFormError("");
    loginAs(matchedUser.id);
    showToast(`Welcome back, ${matchedUser.name}.`, "success");
    router.replace("/dashboard");
  };

  const handleSetup = () => {
    const trimmedCompany = companyName.trim();
    const trimmedAdmin = adminName.trim();
    const normalizedEmail = normalizeEmail(setupEmail);

    if (!trimmedCompany || !trimmedAdmin || !normalizedEmail || !setupPassword) {
      setSetupError("All fields are required.");
      showToast("Complete all setup fields.", "warning");
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setSetupError("Enter a valid email address.");
      showToast("Enter a valid email address.", "warning");
      return;
    }
    if (setupPassword.length < 8) {
      setSetupError("Password must be at least 8 characters.");
      showToast("Password must be at least 8 characters.", "warning");
      return;
    }

    setSetupError("");
    bootstrapSuperAdmin({
      companyName: trimmedCompany,
      adminName: trimmedAdmin,
      email: normalizedEmail,
      password: setupPassword
    });
    showToast("Setup complete. Welcome!", "success");
    router.replace("/dashboard");
  };

  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Image
            source={require("../../logo1.png")}
            style={styles.loginLogo}
            resizeMode="contain"
            accessible
            accessibilityLabel="Mindbridge Innovations logo"
          />
        </View>
        <Card style={styles.card}>
          {isFirstRun ? (
            <>
              <Text style={styles.title}>First-time setup</Text>
              <Text style={styles.caption}>
                Create your company and super admin to start configuring access.
              </Text>
              <FormField label="Company name" error={setupError ? " " : undefined}>
                <TextInput
                  value={companyName}
                  onChangeText={(value) => {
                    setCompanyName(value);
                    if (setupError) setSetupError("");
                  }}
                  placeholder="Company name"
                  placeholderTextColor={theme.colors.inkSubtle}
                  accessibilityLabel="Company name"
                  style={styles.input}
                />
              </FormField>
              <FormField label="Super admin name">
                <TextInput
                  value={adminName}
                  onChangeText={(value) => {
                    setAdminName(value);
                    if (setupError) setSetupError("");
                  }}
                  placeholder="Full name"
                  placeholderTextColor={theme.colors.inkSubtle}
                  accessibilityLabel="Super admin name"
                  style={styles.input}
                />
              </FormField>
              <FormField label="Super admin email">
                <TextInput
                  value={setupEmail}
                  onChangeText={(value) => {
                    setSetupEmail(value);
                    if (setupError) setSetupError("");
                  }}
                  placeholder="Email address"
                  placeholderTextColor={theme.colors.inkSubtle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  accessibilityLabel="Super admin email"
                  style={styles.input}
                />
              </FormField>
              <FormField label="Password" error={setupError || undefined}>
                <TextInput
                  value={setupPassword}
                  onChangeText={(value) => {
                    setSetupPassword(value);
                    if (setupError) setSetupError("");
                  }}
                  placeholder="Create a password (min 8 chars)"
                  placeholderTextColor={theme.colors.inkSubtle}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Super admin password"
                  style={styles.input}
                />
              </FormField>
              <Button
                label="Create super admin"
                onPress={handleSetup}
                disabled={!canSetup}
                accessibilityLabel="Create super admin"
              />
              {setupError ? <Text style={styles.formError}>{setupError}</Text> : null}
            </>
          ) : (
            <>
              <Text style={styles.title}>Sign in</Text>
              <FormField label="Email" error={emailError || undefined}>
                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (emailError) setEmailError("");
                    if (formError) setFormError("");
                  }}
                  placeholder="Email address"
                  placeholderTextColor={theme.colors.inkSubtle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  accessibilityLabel="Email address"
                  style={styles.input}
                />
              </FormField>
              <FormField label="Password" error={passwordError || undefined}>
                <View style={styles.passwordRow}>
                  <TextInput
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (passwordError) setPasswordError("");
                      if (formError) setFormError("");
                    }}
                    placeholder="Password"
                    placeholderTextColor={theme.colors.inkSubtle}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                    autoComplete="password"
                    textContentType="password"
                    accessibilityLabel="Password"
                    style={[styles.input, styles.passwordInput]}
                  />
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.passwordToggle}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    <Text style={styles.passwordToggleText}>
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>
              </FormField>
              <Button
                label="Login"
                onPress={handleLogin}
                disabled={!canSubmit}
                accessibilityLabel="Login"
              />
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            </>
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
    justifyContent: "center",
    gap: theme.spacing.xl
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm
  },
  loginLogo: {
    width: 360,
    height: 170,
    maxWidth: "100%"
  },
  caption: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    fontFamily: theme.typography.body,
    textAlign: "center",
    color: theme.colors.inkSubtle,
    lineHeight: 20,
    maxWidth: 560
  },
  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
    padding: theme.spacing.lg,
    borderColor: theme.colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.94)"
  },
  title: {
    fontSize: 19,
    fontFamily: theme.typography.heading,
    fontWeight: "700",
    color: theme.colors.ink,
    marginBottom: theme.spacing.md
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    fontFamily: theme.typography.body,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceMuted
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0
  },
  passwordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted
  },
  passwordToggleText: {
    fontSize: 12,
    fontFamily: theme.typography.body,
    fontWeight: "700",
    color: theme.colors.accentDark,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  
  formError: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    fontFamily: theme.typography.body,
    textAlign: "center",
    color: theme.colors.danger
  },
  helpText: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    fontFamily: theme.typography.body,
    textAlign: "center",
    color: theme.colors.inkSubtle
  }
});
