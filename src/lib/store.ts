"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Attachment, Job, JobServiceLine, PriceItem, Stage, Todo } from "./types";
import { useEffect, useState } from "react";

const uid = () => Math.random().toString(36).slice(2, 10);

type Store = {
  // Data
  jobs: Job[];
  priceBook: PriceItem[];

  // Jobs API
  addJob: (j: Omit<Job, "id">) => void;
  updateJob: (id: string, patch: Partial<Job>) => void;
  removeJob: (id: string) => void;
  moveJob: (id: string, to: Stage) => void;
  replaceAll: (rows: Job[]) => void;
  clearAll: () => void;

  // CSV
  exportCSVBlob: () => Blob;

  // Price book API
  addPriceItem: (name?: string, unitPrice?: number, category?: string, unitNote?: string) => void;
  updatePriceItem: (id: string, patch: Partial<PriceItem>) => void;
  removePriceItem: (id: string) => void;
  replacePriceBook: (items: PriceItem[]) => void;

  // Seed helpers
  seedPriceBookKNGJuly2025: () => void;
};

export const useAppStore = create<Store>()(
  persist(
    (set, get) => ({
      jobs: [],
      // keep an initial tiny sample; you'll import the full KNG list via the seed button
      priceBook: [
        { id: uid(), name: "SIP Port (single DID)", unitPrice: 49, category: "Telephony – Services" },
        { id: uid(), name: "3CX Install", unitPrice: 899, category: "Phone Systems – Services" },
      ],

      addJob: (j) =>
        set((s) => ({
          jobs: [{ id: uid(), ...j }, ...s.jobs],
        })),

      updateJob: (id, patch) =>
        set((s) => ({
          jobs: s.jobs.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),

      removeJob: (id) =>
        set((s) => ({ jobs: s.jobs.filter((x) => x.id !== id) })),

      moveJob: (id, to) =>
        set((s) => ({
          jobs: s.jobs.map((x) => (x.id === id ? { ...x, status: to } : x)),
        })),

      replaceAll: (rows) => set({ jobs: rows }),

      clearAll: () => set({ jobs: [] }),

      exportCSVBlob: () => {
        const headers = [
          "id",
          "customer",
          "reference",
          "status",
          "address",
          "numbersList",
          "billingContactName",
          "billingContactEmail",
          "billingContactPhone",
          "siteContactName",
          "siteContactEmail",
          "siteContactPhone",
          "services", // encoded lines: name@qty@price | name@qty@price
          "notes",
        ];
        const esc = (v: unknown) => {
          const s = v == null ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const encodeLines = (lines?: JobServiceLine[]) =>
          (lines || [])
            .map((l) => `${l.name}@${l.qty}@${l.unitPrice}`)
            .join("|");

        const lines = [
          headers.join(","),
          ...get().jobs.map((j) =>
            [
              j.id,
              j.customer,
              j.reference ?? "",
              j.status,
              j.address ?? "",
              (j.numbersList || []).join("|"),
              j.billingContactName ?? "",
              j.billingContactEmail ?? "",
              j.billingContactPhone ?? "",
              j.siteContactName ?? "",
              j.siteContactEmail ?? "",
              j.siteContactPhone ?? "",
              encodeLines(j.services),
              j.notes ?? "",
            ]
              .map(esc)
              .join(",")
          ),
        ];
        return new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      },

      // Price book API
      addPriceItem: (name = "", unitPrice = 0, category?: string, unitNote?: string) =>
        set((s) => ({
          priceBook: [{ id: uid(), name, unitPrice, category, unitNote }, ...s.priceBook],
        })),
      updatePriceItem: (id, patch) =>
        set((s) => ({
          priceBook: s.priceBook.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePriceItem: (id) =>
        set((s) => ({ priceBook: s.priceBook.filter((p) => p.id !== id) })),
      replacePriceBook: (items) => set({ priceBook: items }),

      // One-click seed from your KNG July 2025 doc
      seedPriceBookKNGJuly2025: () => {
        const items: PriceItem[] = [
          // Telephony – Trunks
          { id: uid(), category: "Telephony – Trunks", name: "Next SIP Trunk - PAYG (calls as you go)", unitPrice: 10, unitNote: "(Per Channel)" },
          { id: uid(), category: "Telephony – Trunks", name: "Next SIP Trunk - Included (Local + National + Mobile)", unitPrice: 50, unitNote: "(Per Channel)" },

          // Telephony – Services
          { id: uid(), category: "Telephony – Services", name: "100 range DID", unitPrice: 60 },
          { id: uid(), category: "Telephony – Services", name: "Single number DID", unitPrice: 5 },
          { id: uid(), category: "Telephony – Services", name: "Inbound 13, 18 DID", unitPrice: 30 },
          { id: uid(), category: "Telephony – Services", name: "1300/1800 Numbers Port", unitPrice: 125 },

          // Telephony – Once-Off Charges
          { id: uid(), category: "Telephony – Once-Off", name: "Complex Port (Cat C)", unitPrice: 300 },
          { id: uid(), category: "Telephony – Once-Off", name: "Simple Port (Cat A)", unitPrice: 100 },

          // Telephony – PAYG Call Rates (store unitPrice as numeric; use unitNote for clarity)
          { id: uid(), category: "Telephony – PAYG Call Rates", name: "Local & National Calls", unitPrice: 0.10, unitNote: "per call" },
          { id: uid(), category: "Telephony – PAYG Call Rates", name: "Mobile Calls", unitPrice: 0.20, unitNote: "per minute" },
          { id: uid(), category: "Telephony – PAYG Call Rates", name: "13/1300 Calls", unitPrice: 0.33, unitNote: "per call" },

          // NBN
          { id: uid(), category: "NBN", name: "NBN 25/5 Ultd (FTTB & FTTN)", unitPrice: 70 },
          { id: uid(), category: "NBN", name: "NBN 25/10 Ultd (Fibre, FTTC & HFC)", unitPrice: 70 },
          { id: uid(), category: "NBN", name: "NBN 50/20 Ultd", unitPrice: 90 },
          { id: uid(), category: "NBN", name: "NBN 100/40 Ultd", unitPrice: 120 },
          { id: uid(), category: "NBN", name: "NBN 250/100 Ultd (FTTP Only)", unitPrice: 120 },
          { id: uid(), category: "NBN", name: "NBN 500/200 Ultd (FTTP Only)", unitPrice: 140 },
          { id: uid(), category: "NBN", name: "NBN 1000/400 Ultd (FTTP Only)", unitPrice: 170 },
          { id: uid(), category: "NBN", name: "Static IP Address", unitPrice: 5 },
          { id: uid(), category: "NBN", name: "NBN Connection Fees (All Connections) - Once Off", unitPrice: 360 },

          // Phone Systems – Next PBX Charges
          { id: uid(), category: "Phone Systems – Next PBX", name: "Virtual Charge", unitPrice: 30 },
          { id: uid(), category: "Phone Systems – Next PBX", name: "Extension - PAYG (User extensions or Fax)", unitPrice: 10 },
          { id: uid(), category: "Phone Systems – Next PBX", name: "Extension - Included (User extensions or Fax)", unitPrice: 30 },

          // 3CX Pricing (flattened)
          { id: uid(), category: "Phone Systems – 3CX Pro", name: "3CX Pro – 8 Users", unitPrice: 150 },
          { id: uid(), category: "Phone Systems – 3CX Enterprise", name: "3CX Enterprise – 8 Users", unitPrice: 170 },
          { id: uid(), category: "Phone Systems – 3CX Pro", name: "3CX Pro – 16 Users", unitPrice: 220 },
          { id: uid(), category: "Phone Systems – 3CX Enterprise", name: "3CX Enterprise – 16 Users", unitPrice: 260 },
          { id: uid(), category: "Phone Systems – 3CX Pro", name: "3CX Pro – 24 Users", unitPrice: 280 },
          { id: uid(), category: "Phone Systems – 3CX Enterprise", name: "3CX Enterprise – 24 Users", unitPrice: 320 },
          { id: uid(), category: "Phone Systems – 3CX Pro", name: "3CX Pro – 32 Users", unitPrice: 330 },
          { id: uid(), category: "Phone Systems – 3CX Enterprise", name: "3CX Enterprise – 32 Users", unitPrice: 390 },
        ];
        set({ priceBook: items });
      },
    }),
    { name: "comtech-lite-store-v3" }
  )
);

// SSR hydration helper
export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
