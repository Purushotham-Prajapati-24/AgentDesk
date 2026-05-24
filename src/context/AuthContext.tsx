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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const response = await getCurrentUser();
    if (response.success) {
      setUser(response.user);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
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
