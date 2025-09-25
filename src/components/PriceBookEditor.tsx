"use client";
import React from "react";
import { useAppStore } from "../lib/store";
import { Trash2, Plus } from "lucide-react";

export default function PriceBookEditor() {
  const items = useAppStore((s) => s.priceBook);
  const add = useAppStore((s) => s.addPriceItem);
  const upd = useAppStore((s) => s.updatePriceItem);
  const del = useAppStore((s) => s.removePriceItem);

  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Price Book (Services)</h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm hover:bg-gray-50"
          onClick={() => add("New Service", 0)}
        >
          <Plus className="h-4 w-4" /> Add Service
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left text-xs uppercase text-gray-700">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Unit Price (ex GST)</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
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
                    type="number"
                    step="0.01"
                    className="w-40 rounded border p-2"
                    value={String(it.unitPrice)}
                    onChange={(e) => upd(it.id, { unitPrice: Number(e.target.value || 0) })}
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
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                  No services yet — click “Add Service”
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
