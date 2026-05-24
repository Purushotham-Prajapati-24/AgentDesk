"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { account } from "@/lib/appwrite";
import { Models } from "appwrite";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    account
      .get()
      .then((currentUser) => {
        if (isActive) {
          setUser(currentUser);
          if (typeof window !== "undefined") {
            try {
              const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "6a12a61100219ba50305";
              const fallbackKey = `cookieFallback`;
              const fallbackStr = localStorage.getItem(fallbackKey);
              if (fallbackStr) {
                const fallbacks = JSON.parse(fallbackStr);
                const secret = fallbacks[`a_session_${projectId.toLowerCase()}`] || fallbacks[`a_session_${projectId.toLowerCase()}_legacy`];
                if (secret) {
                  import("@/app/auth-actions").then(m => m.syncSession(secret));
                }
              }
            } catch (e) {
              // ignore sync errors
            }
          }
        }
      })
      .catch(() => {
        if (isActive) {
          setUser(null);
          if (typeof window !== "undefined") {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
              if (key.startsWith("cookieFallback")) {
                localStorage.removeItem(key);
              }
            });
          }
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const logout = async () => {
    try {
      await account.deleteSession("current");
      import("@/app/auth-actions").then(m => m.clearSessionCookie());
      setUser(null);
      router.push("/login");
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
