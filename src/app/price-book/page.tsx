"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useAppStore, useHasHydrated } from "../../lib/store";
import { Plus, Trash2, RotateCw } from "lucide-react";

export default function PriceBookPage() {
  const hydrated = useHasHydrated();
  const items = useAppStore((s) => s.priceBook);
  const add = useAppStore((s) => s.addPriceItem);
  const upd = useAppStore((s) => s.updatePriceItem);
  const del = useAppStore((s) => s.removePriceItem);
  const replace = useAppStore((s) => s.replacePriceBook);
  const seed = useAppStore((s) => s.seedPriceBookKNGJuly2025);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof items>();
    items.forEach((p) => {
      const key = p.category || "Uncategorised";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  if (!hydrated) return null;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Price Book</h1>
          <p className="text-sm text-gray-700">This is the reference used when you add services to a job.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-xl border px-3 py-2 hover:bg-gray-50">← Back to Jobs</Link>
          <button
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-gray-50"
            onClick={() => add("New Service", 0, "Uncategorised")}
            title="Add a blank service row"
          >
            <Plus className="h-4 w-4" /> Add Service
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-gray-50"
            onClick={() => {
              if (confirm("Replace current price book with ‘KNG July 2025’ items? This cannot be undone.")) {
                seed();
              }
            }}
            title="Replace with KNG July 2025"
          >
            <RotateCw className="h-4 w-4" /> Import KNG July 2025
          </button>
        </div>
      </header>

      {byCategory.map(([cat, rows]) => (
        <section key={cat} className="mb-6 rounded-2xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{cat}</h2>
            <div className="text-xs text-gray-500">{rows.length} item(s)</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left text-xs uppercase text-gray-700">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Unit Note</th>
                  <th className="px-3 py-2">Unit Price (ex GST)</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded border p-2"
                        value={it.name}
                        onChange={(e) => upd(it.id, { name: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded border p-2"
                        placeholder="e.g. (Per Channel), per minute"
                        value={it.unitNote || ""}
                        onChange={(e) => upd(it.id, { unitNote: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        className="w-32 rounded border p-2"
                        value={String(it.unitPrice)}
                        onChange={(e) => upd(it.id, { unitPrice: Number(e.target.value || 0) })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-56 rounded border p-2"
                        value={it.category || ""}
                        onChange={(e) => upd(it.id, { category: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-red-50"
                        onClick={() => del(it.id)}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No items in this category.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {byCategory.length === 0 && (
        <section className="rounded-2xl border bg-white p-6 text-center text-gray-600">
          No services yet. Click <strong>Import KNG July 2025</strong> to load your list, or <strong>Add Service</strong> to create items manually.
        </section>
      )}
    </div>
  );
}
