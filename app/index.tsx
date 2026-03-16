import React from "react";
import { Redirect } from "expo-router";
import { useCurrentUser } from "../src/hooks/useCurrentUser";

export default function Index() {
  const user = useCurrentUser();
  if (!user) {
    return <Redirect href="/auth/login" />;
  }
  return <Redirect href="/dashboard" />;
}
