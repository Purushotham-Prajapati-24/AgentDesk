"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentUser, logoutSession, type AuthUser } from "@/app/auth-actions";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const VISUAL_AUDIT_ENABLED = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_VISUAL_AUDIT_MODE === "true";
const VISUAL_AUDIT_USER: AuthUser = {
  $id: "visual-audit-user",
  email: "visual-audit@agentdesk.local",
  name: "Visual Audit",
  prefs: {
    tenant_id: "tenant_visual_audit",
    role: "admin",
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(VISUAL_AUDIT_ENABLED ? VISUAL_AUDIT_USER : null);
  const [loading, setLoading] = useState(!VISUAL_AUDIT_ENABLED);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    if (VISUAL_AUDIT_ENABLED) {
      setUser(VISUAL_AUDIT_USER);
      setLoading(false);
      return;
    }

    const response = await getCurrentUser();
    if (response.success) {
      setUser(response.user);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (VISUAL_AUDIT_ENABLED) {
      return;
    }

    let isActive = true;

    getCurrentUser().then((response) => {
      if (!isActive) {
        return;
      }

      setUser(response.success ? response.user : null);
      setLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const logout = async () => {
    if (VISUAL_AUDIT_ENABLED) {
      router.push("/");
      return;
    }

    try {
      await logoutSession();
      setUser(null);
      router.push("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
