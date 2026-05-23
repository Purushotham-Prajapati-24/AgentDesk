"use server";

import {
  getTenantBillingSnapshot as loadTenantBillingSnapshot,
  getTenantCreditBalance as loadTenantCreditBalance,
} from "@/lib/credits";

export async function getTenantBillingSnapshot(tenantId: string) {
  return loadTenantBillingSnapshot(tenantId);
}

export async function getTenantCreditBalance(tenantId: string) {
  return loadTenantCreditBalance(tenantId);
}
