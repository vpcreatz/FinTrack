"use client";

import { useCallback, useEffect, useState } from "react";

export function useCurrency() {
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    let cancelled = false;
    async function loadCurrency() {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) return;
        const result = await response.json();
        const value = result.profile?.currency;
        if (!cancelled && typeof value === "string" && /^[A-Z]{3}$/.test(value)) {
          setCurrency(value);
        }
      } catch {
        // Keep INR as the safe default if profile preferences are unavailable.
      }
    }
    void loadCurrency();
    return () => { cancelled = true; };
  }, []);

  const formatMoney = useCallback((amount: number) => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0), [currency]);

  return { currency, formatMoney };
}
