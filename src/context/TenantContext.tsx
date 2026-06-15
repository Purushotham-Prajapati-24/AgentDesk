"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { getCurrentTenant } from "@/app/auth-actions";

interface TenantDetails {
  $id: string;
  name: string;
  plan: string;
  balance: number;
}

interface TenantContextType {
  tenant: TenantDetails | null;
  role: "admin" | "agent" | null;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);
const VISUAL_AUDIT_ENABLED = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_VISUAL_AUDIT_MODE === "true";
const VISUAL_AUDIT_TENANT: TenantDetails = {
  $id: "tenant_visual_audit",
  name: "Visual Audit Tenant",
  plan: "Pro",
  balance: 1240,
};

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<TenantDetails | null>(VISUAL_AUDIT_ENABLED ? VISUAL_AUDIT_TENANT : null);
  const [role, setRole] = useState<"admin" | "agent" | null>(VISUAL_AUDIT_ENABLED ? "admin" : null);
  const [loading, setLoading] = useState(!VISUAL_AUDIT_ENABLED);

  const userId = user?.$id ?? null;

  useEffect(() => {
    const fetchTenantData = async () => {
      if (VISUAL_AUDIT_ENABLED) {
        return;
      }

      if (!userId) {
        setTenant(null);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentTenant();
        if (response.success) {
          setTenant({
            $id: response.tenant.$id,
            name: response.tenant.name,
            plan: response.tenant.plan,
            balance: response.tenant.balance,
          });
          setRole(response.tenant.role);
        } else {
          setTenant(null);
          setRole(null);
          console.error("Failed to fetch tenant data", response.error);
        }
      } catch (error) {
        console.error("Failed to fetch tenant data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantData();
  }, [userId]);

  return (
    <TenantContext.Provider value={{ tenant, role, loading }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
};
