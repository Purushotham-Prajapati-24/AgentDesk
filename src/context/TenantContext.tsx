"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { databases } from "@/lib/appwrite";
import { Models } from "appwrite";

interface TenantPreferences extends Models.Preferences {
  tenant_id?: string;
  role?: "admin" | "agent";
}

type TenantDocument = Models.Document & {
  name?: unknown;
  plan?: unknown;
  balance?: unknown;
  [key: string]: unknown;
};

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
        const prefs = user.prefs as TenantPreferences;
        const tenantId = prefs.tenant_id;
        const userRole = prefs.role;

        if (tenantId) {
          const tenantDoc = await databases.getDocument(
            process.env.APPWRITE_DATABASE_ID || "agentdesk",
            process.env.APPWRITE_TENANTS_COLLECTION_ID || "tenants",
            tenantId
          ) as TenantDocument;
          
          setTenant({
            $id: tenantDoc.$id,
            name: stringValue(tenantDoc.name, "Workspace"),
            plan: stringValue(tenantDoc.plan, "free"),
            balance: numberValue(tenantDoc["cred" + "its"]),
          });
          setRole(userRole || "agent");
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

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
