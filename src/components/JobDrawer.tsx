"use client";

import React, { useEffect, useMemo, useState } from "react";
import AddressAutocomplete from "./AddressAutocomplete";
import { useAppStore } from "../lib/store";
import type { Job, JobServiceLine, Adjustment } from "../lib/types";
import { Plus } from "lucide-react";

/* ---------- utils ---------- */

const currencyAUD = (v: number) => {
  try {
    return v.toLocaleString(undefined, { style: "currency", currency: "AUD" });
  } catch {
    return `$${v.toFixed(2)}`;
  }
};

export default function AddJobDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addJobToStore = useAppStore((s) => s.addJob);
  const priceBook = useAppStore((s) => s.priceBook);

  // Basics
  const [customer, setCustomer] = useState("");
  const [reference, setReference] = useState(""); // Simpro Job #
  const [address, setAddress] = useState("");

  // Numbers / DIDs
  const [numbers, setNumbers] = useState<string[]>([""]);
  const [mainIdx, setMainIdx] = useState<number | null>(null);
  const [billingFromIdx, setBillingFromIdx] = useState<number | null>(null);

  // Contacts
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingPhone, setBillingPhone] = useState("");

  const [siteSameAsBilling, setSiteSameAsBilling] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteEmail, setSiteEmail] = useState("");
  const [sitePhone, setSitePhone] = useState("");

  useEffect(() => {
    if (siteSameAsBilling) {
      setSiteName(billingName);
      setSiteEmail(billingEmail);
      setSitePhone(billingPhone);
    }
  }, [siteSameAsBilling, billingName, billingEmail, billingPhone]);

  useEffect(() => {
    if (billingFromIdx !== null) {
      setBillingPhone(numbers[billingFromIdx] || "");
    }
  }, [billingFromIdx, numbers]);

  // Service line draft (ex GST)
  type LineDraft = { serviceId?: string; name: string; unitPrice: number | ""; qty: number | ""; unitNote?: string };
  const [lines, setLines] = useState<LineDraft[]>([{ name: "", unitPrice: "", qty: 1 }]);

  const addLine = () => setLines((prev) => [...prev, { name: "", unitPrice: "", qty: 1 }]);
  const delLine = (i: number) =>
    setLines((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length ? next : [{ name: "", unitPrice: "", qty: 1 }];
    });
  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const onPickService = (i: number, serviceId: string) => {
    const item = priceBook.find((p) => p.id === serviceId);
    if (item) {
      setLine(i, {
        serviceId,
        name: item.name,
        unitPrice: item.unitPrice,
        qty: (lines[i].qty || 1) as number,
        unitNote: item.unitNote,
      });
    } else {
      setLine(i, { serviceId: undefined, name: "", unitPrice: "", qty: (lines[i].qty || 1) as number, unitNote: "" });
    }
  };

  const lineTotal = (l: LineDraft) => {
    const price = typeof l.unitPrice === "number" ? l.unitPrice : 0;
    const qty = typeof l.qty === "number" ? l.qty : 0;
    return price * qty;
  };
  const draftSubtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  // Adjustments (ex GST)
  type AdjDraft = { label: string; amountEx: number | "" };
  const [adjs, setAdjs] = useState<AdjDraft[]>([]);
  const addAdj = () => setAdjs((p) => [...p, { label: "", amountEx: 0 }]);
  const setAdj = (i: number, patch: Partial<AdjDraft>) =>
    setAdjs((p) => p.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const delAdj = (i: number) => setAdjs((p) => p.filter((_, idx) => idx !== i));

  const adjSumEx = adjs.reduce((s, a) => s + (typeof a.amountEx === "number" ? a.amountEx : 0), 0);
  const totalEx = draftSubtotal + adjSumEx;
  const gst = totalEx * 0.1;
  const totalInc = totalEx + gst;

  // Numbers helpers
  const addNumber = () => setNumbers((prev) => [...prev, ""]);
  const setNumberAt = (i: number, v: string) => setNumbers((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  const delNumberAt = (i: number) =>
    setNumbers((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      if (mainIdx === i) setMainIdx(null);
      if (billingFromIdx === i) setBillingFromIdx(null);
      return next.length ? next : [""];
    });

  // Group price book for nicer select
  const groupedPriceBook = useMemo(() => {
    const map = new Map<string, typeof priceBook>();
    priceBook.forEach((p) => {
      const key = p.category || "Uncategorised";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [priceBook]);

  // Save
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!customer.trim()) {
      alert("Customer is required");
      return;
    }

    const cleanNumbers = numbers.map((n) => n.trim()).filter(Boolean);

    const cleanLines: JobServiceLine[] = lines
      .map((l) => ({
        id: Math.random().toString(36).slice(2, 10),
        serviceId: l.serviceId || undefined,
        name: (l.name || "").trim(),
        unitPrice: typeof l.unitPrice === "number" ? l.unitPrice : Number(l.unitPrice || 0),
        qty: typeof l.qty === "number" ? l.qty : Number(l.qty || 0),
        unitNote: l.unitNote || undefined,
      }))
      .filter((l) => l.name && l.qty > 0);

    const cleanAdjs: Adjustment[] = adjs
      .map((a) => ({
        id: Math.random().toString(36).slice(2, 10),
        label: a.label.trim() || "Adjustment",
        amountEx: typeof a.amountEx === "number" ? a.amountEx : Number(a.amountEx || 0),
      }))
      .filter((a) => a.label);

    const newJob: Omit<Job, "id"> = {
      customer: customer.trim(),
      reference: reference.trim() || undefined,
      address: address.trim() || undefined,

      numbersList: cleanNumbers,
      primaryNumber: mainIdx !== null ? (cleanNumbers[mainIdx] || undefined) : undefined,

      status: "In Tray",

      billingContactName: billingName.trim() || undefined,
      billingContactEmail: billingEmail.trim() || undefined,
      billingContactPhone: billingPhone.trim() || undefined,

      siteContactName: (siteSameAsBilling ? billingName : siteName).trim() || undefined,
      siteContactEmail: (siteSameAsBilling ? billingEmail : siteEmail).trim() || undefined,
      siteContactPhone: (siteSameAsBilling ? billingPhone : sitePhone).trim() || undefined,

      services: cleanLines,
      adjustments: cleanAdjs,

      notes: "",
      todos: [],
      attachments: [],
    };

    addJobToStore(newJob);

    // Reset & close
    setCustomer("");
    setReference("");
    setAddress("");
    setNumbers([""]);
    setMainIdx(null);
    setBillingFromIdx(null);
    setBillingName(""); setBillingEmail(""); setBillingPhone("");
    setSiteSameAsBilling(false);
    setSiteName(""); setSiteEmail(""); setSitePhone("");
    setLines([{ name: "", unitPrice: "", qty: 1 }]);
    setAdjs([]);

    onClose();
  };

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-semibold">Add Job</div>
          <button className="rounded border px-2 py-1 text-sm hover:bg-gray-50" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Body */}
        <div className="h-[calc(100%-56px)] overflow-y-auto p-4">
          <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm">Customer</label>
              <input
                className="w-full rounded-xl border p-2"
                placeholder="e.g. Navorina Nursing Home"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm">Simpro Job #</label>
              <input
                className="w-full rounded-xl border p-2"
                placeholder="e.g. J123456"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm">Address</label>
              <AddressAutocomplete value={address} onChange={setAddress} />
            </div>

            {/* Numbers with badges */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm">Numbers (add all to be ported)</label>
              <div className="space-y-2">
                {numbers.map((n, i) => {
                  const tone =
                    mainIdx === i && billingFromIdx === i
                      ? "bg-indigo-50 border-indigo-300"
                      : mainIdx === i
                      ? "bg-blue-50 border-blue-300"
                      : billingFromIdx === i
                      ? "bg-emerald-50 border-emerald-300"
                      : "";

                  return (
                    <div
                      key={i}
                      className={`grid grid-cols-1 items-center gap-2 rounded-xl border p-2 transition-colors md:grid-cols-12 ${tone}`}
                    >
                      <div className="md:col-span-6">
                        <div className="flex items-center gap-2">
                          <input
                            className="w-full flex-1 rounded-xl border p-2 bg-white"
                            placeholder="03 xxxx xxxx or DID range"
                            value={n}
                            onChange={(e) => setNumberAt(i, e.target.value)}
                          />
                          {mainIdx === i && (
                            <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              MAIN
                            </span>
                          )}
                          {billingFromIdx === i && (
                            <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              BILLING
                            </span>
                          )}
                        </div>
                      </div>

                      <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={mainIdx === i}
                          onChange={() => setMainIdx(mainIdx === i ? null : i)}
                        />
                        Main
                      </label>

                      <label className="md:col-span-3 inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={billingFromIdx === i}
                          onChange={() => setBillingFromIdx(billingFromIdx === i ? null : i)}
                        />
                        Use for Billing phone
                      </label>

                      <div className="md:col-span-1 flex justify-end">
                        <button
                          type="button"
                          className="rounded border px-2 py-1"
                          onClick={() => delNumberAt(i)}
                          title="Remove"
                        >
                          –
                        </button>
                        {i === numbers.length - 1 && (
                          <button
                            type="button"
                            className="ml-2 rounded border px-2 py-1"
                            onClick={addNumber}
                            title="Add"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contacts */}
            <div className="md:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border p-3">
                <div className="mb-2 text-sm font-medium">Billing Contact</div>
                <div className="space-y-2">
                  <input
                    className="w-full rounded-xl border p-2"
                    placeholder="Name"
                    value={billingName}
                    onChange={(e) => setBillingName(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border p-2"
                    placeholder="Email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border p-2"
                    placeholder="Phone"
                    value={billingPhone}
                    onChange={(e) => setBillingPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium">Site Contact</div>
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={siteSameAsBilling}
                      onChange={(e) => setSiteSameAsBilling(e.target.checked)}
                    />
                    Same as billing
                  </label>
                </div>
                <div className="space-y-2">
                  <input
                    className="w-full rounded-xl border p-2"
                    placeholder="Name"
                    value={siteName}
                    disabled={siteSameAsBilling}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border p-2"
                    placeholder="Email"
                    value={siteEmail}
                    disabled={siteSameAsBilling}
                    onChange={(e) => setSiteEmail(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border p-2"
                    placeholder="Phone"
                    value={sitePhone}
                    disabled={siteSameAsBilling}
                    onChange={(e) => setSitePhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm">Services (ex GST)</label>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                    <div className="md:col-span-3">
                      <select
                        className="w-full rounded-xl border p-2"
                        value={l.serviceId || ""}
                        onChange={(e) => onPickService(i, e.target.value)}
                      >
                        <option value="">— Pick from Price Book —</option>
                        {groupedPriceBook.map(([cat, list]) => (
                          <optgroup key={cat} label={cat}>
                            {list.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}{p.unitNote ? ` ${p.unitNote}` : ""}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <input
                        className="w-full rounded-xl border p-2"
                        placeholder="Service name"
                        value={l.name}
                        onChange={(e) => setLine(i, { name: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-xl border p-2"
                        placeholder="Unit Price"
                        value={l.unitPrice === "" ? "" : String(l.unitPrice)}
                        onChange={(e) =>
                          setLine(i, { unitPrice: e.target.value === "" ? "" : Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="md:col-span-1">
                      <input
                        type="number"
                        className="w-full rounded-xl border p-2"
                        placeholder="Qty"
                        min={0}
                        value={l.qty === "" ? "" : String(l.qty)}
                        onChange={(e) => setLine(i, { qty: e.target.value === "" ? "" : Number(e.target.value) })}
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between gap-2">
                      <div className="text-sm text-gray-700">= {currencyAUD(lineTotal(l))}</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded border px-2 py-1"
                          onClick={() => delLine(i)}
                          title="Remove line"
                        >
                          –
                        </button>
                        {i === lines.length - 1 && (
                          <button
                            type="button"
                            className="rounded border px-2 py-1"
                            onClick={addLine}
                            title="Add line"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Adjustments (ex GST) */}
            <div className="md:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm">Adjustments (ex GST)</label>
                <button type="button" className="rounded border px-2 py-1 text-sm hover:bg-gray-50" onClick={addAdj}>
                  + Add adjustment
                </button>
              </div>
              <div className="space-y-2">
                {adjs.length === 0 && (
                  <div className="rounded border border-dashed p-3 text-sm text-gray-500">
                    No adjustments (add a discount as negative amount, or a surcharge as positive)
                  </div>
                )}
                {adjs.map((a, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                    <div className="md:col-span-7">
                      <input
                        className="w-full rounded-xl border p-2"
                        placeholder="Label (e.g. Discount, Surcharge)"
                        value={a.label}
                        onChange={(e) => setAdj(i, { label: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-xl border p-2"
                        placeholder="Amount ex (− for discount)"
                        value={a.amountEx === "" ? "" : String(a.amountEx)}
                        onChange={(e) =>
                          setAdj(i, { amountEx: e.target.value === "" ? "" : Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-end">
                      <button type="button" className="rounded border px-2 py-1 hover:bg-red-50" onClick={() => delAdj(i)}>
                        –
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="md:col-span-2 mt-1 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <div className="rounded-xl border p-2">
                Subtotal (ex): <span className="font-medium">{currencyAUD(draftSubtotal)}</span>
              </div>
              <div className="rounded-xl border p-2">
                Adjustments (ex): <span className="font-medium">{currencyAUD(adjSumEx)}</span>
              </div>
              <div className="rounded-xl border p-2">
                GST 10%: <span className="font-medium">{currencyAUD(gst)}</span>
              </div>
              <div className="rounded-xl border p-2">
                Total (inc): <span className="font-semibold">{currencyAUD(totalInc)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="md:col-span-2 mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border px-3 py-2 hover:bg-gray-50"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border bg-black px-3 py-2 text-white hover:opacity-90"
                title="Save Job"
              >
                <Plus className="h-4 w-4" /> Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

