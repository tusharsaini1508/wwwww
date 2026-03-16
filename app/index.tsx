import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useCurrentUser } from "../src/hooks/useCurrentUser";
import { useAppStore } from "../src/store/useAppStore";

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

export default function Index() {
  const user = useCurrentUser();
  const authToken = useAppStore((state) => state.authToken);
  const logout = useAppStore((state) => state.logout);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      if (!user) {
        setCheckingSession(false);
        return;
      }

      if (!API_BASE_URL || !authToken) {
        logout();
        setCheckingSession(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        });

        if (!response.ok) {
          logout();
        }
      } catch {
        logout();
      } finally {
        setCheckingSession(false);
      }
    };

    void validateSession();
  }, [authToken, logout, user]);

  if (checkingSession) {
    return null;
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }
  return <Redirect href="/dashboard" />;
}
