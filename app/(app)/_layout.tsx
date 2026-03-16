import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  UIManager,
  View,
  useWindowDimensions
} from "react-native";
import { Redirect, Slot, router, usePathname, Link } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { AccessDenied } from "../../src/components/AccessDenied";
import { LogoMark } from "../../src/components/LogoMark";
import { theme } from "../../src/theme";
import { useCurrentUser } from "../../src/hooks/useCurrentUser";
import { useAppStore } from "../../src/store/useAppStore";
import { canAccess } from "../../src/lib/permissions";
import { Permission, Role } from "../../src/types";
import { getISTNow } from "../../src/lib/time";

type NavItem = {
  label: string;
  href: string;
  permission: Permission;
  anyPermissions?: Permission[];
  onlyRoles?: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", permission: "dashboard.view" },
  { label: "Inventory", href: "/inventory", permission: "inventory.view" },
  { label: "Operations", href: "/operations", permission: "inventory.view" },
  { label: "Production", href: "/production", permission: "production.view" },
  { label: "Analytics", href: "/analytics", permission: "analytics.view" },
  { label: "Data Hub", href: "/data", permission: "data.exchange" },
  {
    label: "Admin",
    href: "/admin",
    permission: "users.manage",
    anyPermissions: [
      "users.manage",
      "roles.manage",
      "products.edit",
      "procurement.view",
      "audit.view"
    ]
  }
];

const enableLayoutAnimation = () => {
  if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
};

export default function AppLayout() {
  const user = useCurrentUser();
  const overrides = useAppStore((state) => state.roleOverrides);
  const companyOverrides = useAppStore((state) => state.companyOverrides);
  const companies = useAppStore((state) => state.companies);
  const logout = useAppStore((state) => state.logout);
  const { width } = useWindowDimensions();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(width >= 980);
  const [now, setNow] = useState(getISTNow());

  const routeLabel = useMemo(() => {
    const match = NAV_ITEMS.find(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/")
    );
    if (pathname.startsWith("/admin")) {
      return `Admin / ${pathname.split("/").filter(Boolean).slice(1).join(" / ") || "Home"}`;
    }
    return match?.label ?? "Workspace";
  }, [pathname]);

  useEffect(() => {
    enableLayoutAnimation();
  }, []);

  useEffect(() => {
    setSidebarOpen(width >= 980);
  }, [width]);

  useEffect(() => {
    const interval = setInterval(() => setNow(getISTNow()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/auth/login");
  };

  const company = useMemo(
    () => (user ? companies.find((item) => item.id === user.companyId) ?? null : null),
    [companies, user]
  );

  const visibleItems = useMemo(() => {
    if (!user) {
      return [];
    }
    return NAV_ITEMS.filter((item) => {
      if (item.onlyRoles && !item.onlyRoles.includes(user.role)) {
        return false;
      }
      if (item.anyPermissions) {
        return item.anyPermissions.some((perm) =>
          canAccess(user.role, overrides, perm, companyOverrides[user.companyId])
        );
      }
    return canAccess(
      user.role,
      overrides,
      item.permission,
      companyOverrides[user.companyId]
    );
    });
  }, [companyOverrides, overrides, user]);

  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  if (company && !company.active && user.role !== "SUPER_ADMIN") {
    return (
      <Screen>
        <SectionHeader title="Company Suspended" subtitle="Access restricted." />
        <AccessDenied
          title="Company access disabled"
          message="Your company has been suspended by the platform owner."
        />
        <Pressable onPress={handleLogout} style={styles.logoutInline}>
          <Text style={styles.logoutInlineText}>Logout</Text>
        </Pressable>
      </Screen>
    );
  }

  const toggleSidebar = () => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {
      // ignore if not supported
    }
    setSidebarOpen((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.sidebar,
          sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed,
          width < 980 && styles.sidebarOverlay
        ]}
      >
        <View style={styles.brand}>
          <LogoMark size="sm" withWordmark textColor={theme.colors.navText} />
          <Text style={styles.productName}>Warehouse Management System</Text>
        </View>
        <View style={styles.nav}>
          {visibleItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} asChild>
                <Pressable style={styles.link}>
                  <View style={[styles.navItem, active && styles.navItemActive]}>
                    <Text style={[styles.navText, active && styles.navTextActive]}>
                      {item.label}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            );
          })}
        </View>
        <Pressable onPress={handleLogout} style={styles.logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {width < 980 && sidebarOpen ? (
        <Pressable style={styles.backdrop} onPress={toggleSidebar} />
      ) : null}

      <View style={styles.main}>
        <SafeAreaView style={styles.topbar}>
          <View style={styles.topbarLeft}>
            <Pressable onPress={toggleSidebar} style={styles.menuButton}>
              <Text style={styles.menuText}>{sidebarOpen ? "Hide" : "Menu"}</Text>
            </Pressable>
            <Text style={styles.breadcrumb} numberOfLines={1} ellipsizeMode="tail">
              {routeLabel}
            </Text>
          </View>
          <View style={styles.topbarInfo}>
            <Text style={styles.time}>{now}</Text>
            <Text style={styles.user} numberOfLines={1} ellipsizeMode="tail">
              {user.name} - {user.role.replace("_", " ")}
            </Text>
            {company ? (
              <Text style={styles.company} numberOfLines={1} ellipsizeMode="tail">
                {company.name}
              </Text>
            ) : null}
          </View>
        </SafeAreaView>
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: theme.colors.background
  },
  sidebar: {
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.navBackground,
    borderRightWidth: 1,
    borderRightColor: "rgba(231,243,242,0.12)",
    shadowColor: theme.colors.shadowStrong,
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8
  },
  sidebarOpen: {
    width: 280
  },
  sidebarClosed: {
    width: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    overflow: "hidden"
  },
  sidebarOverlay: {
    position: "absolute",
    zIndex: 30,
    height: "100%",
    left: 0,
    top: 0,
    bottom: 0
  },
  brand: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)"
  },
  productName: {
    marginTop: theme.spacing.sm,
    fontSize: 11,
    fontFamily: theme.typography.body,
    fontWeight: "700",
    color: theme.colors.navActive,
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  nav: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.xs
  },
  navItem: {
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: theme.radius.sm,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "transparent"
  },
  navItemActive: {
    backgroundColor: theme.colors.navSurface,
    borderColor: "rgba(122,225,216,0.45)",
    shadowColor: "rgba(0,0,0,0.2)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 10
  },
  navText: {
    color: theme.colors.navText,
    fontSize: 14,
    fontFamily: theme.typography.body,
    fontWeight: "600"
  },
  navTextActive: {
    color: theme.colors.navActive,
    fontWeight: "700"
  },
  link: {
    paddingVertical: 2
  },
  logout: {
    marginTop: "auto",
    marginBottom: theme.spacing.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: "rgba(231,243,242,0.25)",
    backgroundColor: "rgba(231,243,242,0.04)"
  },
  logoutText: {
    color: theme.colors.navText,
    fontFamily: theme.typography.body,
    fontWeight: "600"
  },
  logoutInline: {
    marginTop: theme.spacing.lg,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted
  },
  logoutInlineText: {
    color: theme.colors.ink,
    fontWeight: "600"
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 20
  },
  main: {
    flex: 1,
    backgroundColor: "transparent"
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  topbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    minWidth: 180,
    flex: 1
  },
  menuButton: {
    minWidth: 74,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface
  },
  menuText: {
    fontSize: 12,
    fontFamily: theme.typography.body,
    fontWeight: "700",
    color: theme.colors.accentDark,
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  breadcrumb: {
    fontSize: 12,
    fontFamily: theme.typography.body,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: "700",
    flexShrink: 1
  },
  topbarInfo: {
    maxWidth: 340,
    alignItems: "flex-end",
    minWidth: 0,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.navBackground,
    borderWidth: 1,
    borderColor: "rgba(122,225,216,0.45)",
    shadowColor: theme.colors.shadowStrong,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3
  },
  time: {
    fontSize: 12,
    fontFamily: theme.typography.body,
    color: theme.colors.textOnDark,
    opacity: 1,
    fontWeight: "600"
  },
  user: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: theme.typography.body,
    fontWeight: "600",
    color: "#FFFFFF",
    opacity: 1,
    textAlign: "right",
    flexShrink: 1
  },
  company: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: theme.typography.body,
    color: theme.colors.navActive,
    opacity: 1,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1
  },
  content: {
    flex: 1,
    minHeight: 0
  }
});
