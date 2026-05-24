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

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [role, setRole] = useState<"admin" | "agent" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenantData = async () => {
      if (!user) {
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
  }, [user]);

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
