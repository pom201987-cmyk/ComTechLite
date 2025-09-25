"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Upload,
  Download,
  Columns,
  Table as TableIcon,
  Trash2,
  Search as SearchIcon,
} from "lucide-react";

import {
  STAGES,
  type Job,
  type Stage,
  type JobServiceLine,
  type Adjustment,
} from "../lib/types";
import { useAppStore, useHasHydrated } from "../lib/store";
import { fromCSVFile } from "../lib/csv";
import Kanban from "../components/Kanban";
import AddressAutocomplete from "../components/AddressAutocomplete";

/* -------------------------------------------
   Shared Utils
--------------------------------------------*/
const currencyAUD = (v: number) => {
  try {
    return v.toLocaleString(undefined, { style: "currency", currency: "AUD" });
  } catch {
    return `$${v.toFixed(2)}`;
  }
};
const uid = () => Math.random().toString(36).slice(2, 10);

/* -------------------------------------------
   ADD JOB DRAWER (inline)
--------------------------------------------*/
function AddJobDrawerInline({
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
    if (billingFromIdx !== null) setBillingPhone(numbers[billingFromIdx] || "");
  }, [billingFromIdx, numbers]);

  // Service lines (ex GST)
  type LineDraft = {
    serviceId?: string;
    name: string;
    unitPrice: number | "";
    qty: number | "";
    unitNote?: string;
  };
  const [lines, setLines] = useState<LineDraft[]>([{ name: "", unitPrice: "", qty: 1 }]);
  const addLine = () => setLines((p) => [...p, { name: "", unitPrice: "", qty: 1 }]);
  const delLine = (i: number) =>
    setLines((p) => {
      const n = p.filter((_, idx) => idx !== i);
      return n.length ? n : [{ name: "", unitPrice: "", qty: 1 }];
    });
  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const groupedPriceBook = useMemo(() => {
    const map = new Map<string, typeof priceBook>();
    priceBook.forEach((p) => {
      const key = p.category || "Uncategorised";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [priceBook]);

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
      setLine(i, { serviceId: undefined, name: "", unitPrice: "", qty: 1, unitNote: "" });
    }
  };

  const lineTotal = (l: LineDraft) =>
    (typeof l.unitPrice === "number" ? l.unitPrice : 0) *
    (typeof l.qty === "number" ? l.qty : 0);
  const draftSubtotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  // Adjustments (ex GST)
  type AdjDraft = { label: string; amountEx: number | "" };
  const [adjs, setAdjs] = useState<AdjDraft[]>([]);
  const addAdj = () => setAdjs((p) => [...p, { label: "", amountEx: 0 }]);
  const setAdj = (i: number, patch: Partial<AdjDraft>) =>
    setAdjs((p) => p.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const delAdj = (i: number) => setAdjs((p) => p.filter((_, idx) => idx !== i));

  const adjSumEx = adjs.reduce(
    (s, a) => s + (typeof a.amountEx === "number" ? a.amountEx : 0),
    0
  );
  const totalEx = draftSubtotal + adjSumEx;
  const gst = totalEx * 0.1;
  const totalInc = totalEx + gst;

  // Numbers helpers
  const addNumber = () => setNumbers((p) => [...p, ""]);
  const setNumberAt = (i: number, v: string) =>
    setNumbers((p) => p.map((n, idx) => (idx === i ? v : n)));
  const delNumberAt = (i: number) =>
    setNumbers((p) => {
      const n = p.filter((_, idx) => idx !== i);
      if (mainIdx === i) setMainIdx(null);
      if (billingFromIdx === i) setBillingFromIdx(null);
      return n.length ? n : [""];
    });

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customer.trim()) {
      alert("Customer is required");
      return;
    }

    const cleanNumbers = numbers.map((n) => n.trim()).filter(Boolean);
    const cleanLines: JobServiceLine[] = lines
      .map((l) => ({
        id: uid(),
        serviceId: l.serviceId || undefined,
        name: (l.name || "").trim(),
        unitPrice:
          typeof l.unitPrice === "number" ? l.unitPrice : Number(l.unitPrice || 0),
        qty: typeof l.qty === "number" ? l.qty : Number(l.qty || 0),
        unitNote: l.unitNote || undefined,
      }))
      .filter((l) => l.name && l.qty > 0);

    const cleanAdjs: Adjustment[] = adjs
      .map((a) => ({
        id: uid(),
        label: a.label.trim() || "Adjustment",
        amountEx:
          typeof a.amountEx === "number" ? a.amountEx : Number(a.amountEx || 0),
      }))
      .filter((a) => a.label);

    const newJob: Omit<Job, "id"> = {
      customer: customer.trim(),
      reference: reference.trim() || undefined,
      address: address.trim() || undefined,
      numbersList: cleanNumbers,
      primaryNumber: mainIdx !== null ? cleanNumbers[mainIdx] : undefined,
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

    // reset & close
    setCustomer("");
    setReference("");
    setAddress("");
    setNumbers([""]);
    setMainIdx(null);
    setBillingFromIdx(null);
    setBillingName("");
    setBillingEmail("");
    setBillingPhone("");
    setSiteSameAsBilling(false);
    setSiteName("");
    setSiteEmail("");
    setSitePhone("");
    setLines([{ name: "", unitPrice: "", qty: 1 }]);
    setAdjs([]);
    onClose();
  };

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

            {/* Numbers */}
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
                                {p.name}
                                {p.unitNote ? ` ${p.unitNote}` : ""}
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
                          setLine(i, {
                            unitPrice: e.target.value === "" ? "" : Number(e.target.value),
                          })
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
                        onChange={(e) =>
                          setLine(i, { qty: e.target.value === "" ? "" : Number(e.target.value) })
                        }
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

            {/* Adjustments */}
            <div className="md:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm">Adjustments (ex GST)</label>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
                  onClick={addAdj}
                >
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
                      <button
                        type="button"
                        className="rounded border px-2 py-1 hover:bg-red-50"
                        onClick={() => delAdj(i)}
                      >
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
                GST 10%: <span className="font-medium">{currencyAUD(totalEx * 0.1)}</span>
              </div>
              <div className="rounded-xl border p-2">
                Total (inc): <span className="font-semibold">{currencyAUD(totalEx * 1.1)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="md:col-span-2 mt-2 flex justify-end gap-2">
              <button type="button" className="rounded-xl border px-3 py-2 hover:bg-gray-50" onClick={onClose}>
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

/* -------------------------------------------
   VIEW/EDIT JOB DRAWER (inline)
--------------------------------------------*/
function JobDrawerInline({
  job,
  open,
  onClose,
  onUpdate,
}: {
  job: Job | undefined;
  open: boolean;
  onClose: () => void;
  onUpdate: (patch: Partial<Job>) => void;
}) {
  const priceBook = useAppStore((s) => s.priceBook);
  if (!open || !job) return null;

  // Notes
  const onNotes = (v: string) => onUpdate({ notes: v });

  // To-dos
  const todos = job.todos || [];
  const addTodo = (text: string) =>
    onUpdate({ todos: [...todos, { id: uid(), text, done: false, createdAt: new Date().toISOString() }] });
  const toggleTodo = (id: string) =>
    onUpdate({ todos: todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });
  const delTodo = (id: string) => onUpdate({ todos: todos.filter((t) => t.id !== id) });

  // Attachments
  const attachments = job.attachments || [];
  async function fileToDataUrl(file: File): Promise<string> {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const metas = [];
    for (const f of Array.from(files)) {
      const dataUrl = await fileToDataUrl(f);
      metas.push({
        id: uid(),
        name: f.name,
        size: f.size,
        type: f.type,
        dataUrl,
        createdAt: new Date().toISOString(),
      });
    }
    onUpdate({ attachments: [...attachments, ...metas] });
  };
  const delAttachment = (id: string) =>
    onUpdate({ attachments: attachments.filter((a) => a.id !== id) });

  // Services (editable, ex GST)
  const lines = job.services || [];
  const setLineAt = (i: number, patch: Partial<JobServiceLine>) =>
    onUpdate({
      services: lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    });
  const addLine = () =>
    onUpdate({
      services: [
        ...lines,
        { id: uid(), name: "", unitPrice: 0, qty: 1 },
      ],
    });
  const delLine = (i: number) =>
    onUpdate({ services: lines.filter((_, idx) => idx !== i) });

  const groupedPriceBook = useMemo(() => {
    const map = new Map<string, typeof priceBook>();
    priceBook.forEach((p) => {
      const key = p.category || "Uncategorised";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [priceBook]);

  const onPickService = (i: number, serviceId: string) => {
    const item = priceBook.find((p) => p.id === serviceId);
    if (!item) return;
    setLineAt(i, {
      serviceId,
      name: item.name,
      unitPrice: item.unitPrice,
      qty: lines[i]?.qty || 1,
      unitNote: item.unitNote,
    });
  };

  // Adjustments (ex GST)
  const adjs = job.adjustments || [];
  const setAdjAt = (idx: number, patch: Partial<Adjustment>) =>
    onUpdate({ adjustments: adjs.map((a, i) => (i === idx ? { ...a, ...patch } : a)) });
  const addAdj = () =>
    onUpdate({ adjustments: [...adjs, { id: uid(), label: "", amountEx: 0 }] });
  const delAdj = (idx: number) =>
    onUpdate({ adjustments: adjs.filter((_, i) => i !== idx) });

  // Totals
  const subtotal = lines.reduce((s, l) => s + (l.unitPrice || 0) * (l.qty || 0), 0);
  const adjSumEx = adjs.reduce((s, a) => s + (a.amountEx || 0), 0);
  const totalEx = subtotal + adjSumEx;
  const gst = totalEx * 0.1;
  const totalInc = totalEx + gst;

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-semibold">
            {job.customer} {job.reference ? `– ${job.reference}` : ""}
          </div>
          <button className="rounded border px-2 py-1 text-sm hover:bg-gray-50" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Body */}
        <div className="h-[calc(100%-56px)] overflow-y-auto p-4 space-y-6">
          {/* Notes */}
          <section>
            <h3 className="mb-2 font-medium">Notes</h3>
            <textarea
              className="h-32 w-full rounded border p-2"
              placeholder="Add notes, steps, risks…"
              value={job.notes || ""}
              onChange={(e) => onNotes(e.target.value)}
            />
          </section>

          {/* To-dos */}
          <section>
            <h3 className="mb-2 font-medium">To-Do</h3>
            <TodoAdder onAdd={(t) => addTodo(t)} />
            <ul className="mt-2 space-y-2">
              {todos.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded border p-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!t.done} onChange={() => toggleTodo(t.id)} />
                    <span className={t.done ? "line-through text-gray-500" : ""}>{t.text}</span>
                  </label>
                  <button
                    className="rounded border px-2 py-1 text-xs hover:bg-red-50"
                    onClick={() => delTodo(t.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
              {todos.length === 0 && (
                <li className="text-sm text-gray-500">No to-dos yet</li>
              )}
            </ul>
          </section>

          {/* Attachments */}
          <section>
            <h3 className="mb-2 font-medium">Attachments</h3>
            <input type="file" multiple onChange={(e) => addFiles(e.target.files)} />
            <ul className="mt-2 space-y-2">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded border p-2 text-sm"
                >
                  <span className="truncate">{a.name}</span>
                  <span className="flex items-center gap-2">
                    <a className="rounded border px-2 py-1 hover:bg-gray-50" href={a.dataUrl} download={a.name}>
                      Download
                    </a>
                    <button
                      className="rounded border px-2 py-1 hover:bg-red-50"
                      onClick={() => delAttachment(a.id)}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
              {attachments.length === 0 && (
                <li className="text-sm text-gray-500">No files yet</li>
              )}
            </ul>
          </section>

          {/* Services (editable) */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium">Services (ex GST)</h3>
              <button className="rounded border px-2 py-1 text-sm hover:bg-gray-50" onClick={addLine}>
                + Add line
              </button>
            </div>

            <div className="space-y-2">
              {lines.length === 0 && (
                <div className="rounded border border-dashed p-3 text-sm text-gray-500">
                  No service lines. Add one above.
                </div>
              )}
              {lines.map((l, i) => (
                <div key={l.id} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <select
                      className="w-full rounded-xl border p-2"
                      value={l.serviceId || ""}
                      onChange={(e) => onPickService(i, e.target.value)}
                    >
                      <option value="">— Price Book —</option>
                      {groupedPriceBook.map(([cat, list]) => (
                        <optgroup key={cat} label={cat}>
                          {list.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.unitNote ? ` ${p.unitNote}` : ""}
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
                      onChange={(e) => setLineAt(i, { name: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-xl border p-2"
                      placeholder="Unit Price"
                      value={String(l.unitPrice ?? 0)}
                      onChange={(e) =>
                        setLineAt(i, { unitPrice: Number(e.target.value || 0) })
                      }
                    />
                  </div>
                  <div className="md:col-span-1">
                    <input
                      type="number"
                      className="w-full rounded-xl border p-2"
                      placeholder="Qty"
                      min={0}
                      value={String(l.qty ?? 0)}
                      onChange={(e) => setLineAt(i, { qty: Number(e.target.value || 0) })}
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between gap-2">
                    <div className="text-sm text-gray-700">
                      = {currencyAUD((l.unitPrice || 0) * (l.qty || 0))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded border px-2 py-1 hover:bg-red-50"
                        onClick={() => delLine(i)}
                      >
                        –
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Adjustments */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium">Adjustments (ex GST)</h3>
              <button className="rounded border px-2 py-1 text-sm hover:bg-gray-50" onClick={addAdj}>
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
                <div key={a.id} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                  <div className="md:col-span-7">
                    <input
                      className="w-full rounded-xl border p-2"
                      placeholder="Label"
                      value={a.label}
                      onChange={(e) => setAdjAt(i, { label: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-xl border p-2"
                      placeholder="Amount ex (− for discount)"
                      value={String(a.amountEx ?? 0)}
                      onChange={(e) => setAdjAt(i, { amountEx: Number(e.target.value || 0) })}
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end">
                    <button
                      className="rounded border px-2 py-1 hover:bg-red-50"
                      onClick={() => delAdj(i)}
                    >
                      –
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Totals */}
          <section className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <div className="rounded-xl border p-2">
              Subtotal (ex): <span className="font-medium">{currencyAUD(subtotal)}</span>
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
          </section>
        </div>
      </div>
    </div>
  );
}

function TodoAdder({ onAdd }: { onAdd: (text: string) => void }) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const text = String(fd.get("todo") || "").trim();
        if (!text) return;
        onAdd(text);
        (e.currentTarget.elements.namedItem("todo") as HTMLInputElement).value = "";
      }}
    >
      <input name="todo" className="w-full rounded border p-2" placeholder="Add a task…" />
      <button className="rounded border px-3 py-2 hover:bg-gray-50" type="submit">
        Add
      </button>
    </form>
  );
}

/* -------------------------------------------
   MAIN PAGE
--------------------------------------------*/
export default function Home() {
  const hydrated = useHasHydrated();
  const jobs = useAppStore((s) => s.jobs);
  const updateJob = useAppStore((s) => s.updateJob);
  const removeJob = useAppStore((s) => s.removeJob);
  const moveJob = useAppStore((s) => s.moveJob);
  const replaceAll = useAppStore((s) => s.replaceAll);
  const exportCSVBlob = useAppStore((s) => s.exportCSVBlob);
  const clearAll = useAppStore((s) => s.clearAll);

  const [view, setView] = useState<"table" | "kanban">("kanban");
  const [addOpen, setAddOpen] = useState(false);

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected: Job | undefined = useMemo(
    () => jobs.find((j) => j.id === selectedId),
    [jobs, selectedId]
  );
  const onOpenJob = (j: Job) => {
    setSelectedId(j.id);
    setOpen(true);
  };

  // Filters
  const [q, setQ] = useState("");
  const [fltStage, setFltStage] = useState<"All" | Stage>("All");
  const filteredJobs = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (fltStage !== "All" && j.status !== fltStage) return false;
      if (!ql) return true;
      const hay = [
        j.customer,
        j.reference,
        j.address,
        j.primaryNumber,
        j.status,
        ...(j.numbersList || []),
        ...(j.services?.map((l) => `${l.name} ${l.qty} ${l.unitPrice}`) || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(ql);
    });
  }, [jobs, q, fltStage]);

  // CSV
  const fileRef = useRef<HTMLInputElement>(null);
  const onExport = () => {
    const blob = exportCSVBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comtech-lite-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const onImport = async (f: File) => {
    const rows = await fromCSVFile(f);
    replaceAll(rows);
  };

  if (!hydrated) return null;

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            ComTech Lite – Ports & Installs
          </h1>
          <p className="text-sm text-gray-700">
            Drag Kanban • Job Drawer • Address autocomplete • Price Book • CSV • GST totals
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-black text-white hover:opacity-90"
            onClick={() => setAddOpen(true)}
            title="Add Job"
          >
            <Plus className="h-4 w-4" /> Add Job
          </button>

          <Link href="/price-book" className="rounded-xl border px-3 py-2 bg-white hover:bg-gray-50">
            Price Book
          </Link>

          <button
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white hover:bg-gray-50"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files && onImport(e.target.files[0])}
          />

          <button
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white hover:bg-gray-50"
            onClick={onExport}
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>

          <button
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white hover:bg-red-50"
            onClick={clearAll}
            title="Remove all jobs"
          >
            <Trash2 className="h-4 w-4" /> Clear All
          </button>

          <button
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white hover:bg-gray-50"
            onClick={() => setView((v) => (v === "kanban" ? "table" : "kanban"))}
          >
            {view === "kanban" ? (
              <>
                <TableIcon className="h-4 w-4" /> Table
              </>
            ) : (
              <>
                <Columns className="h-4 w-4" /> Kanban
              </>
            )}
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className="mb-6 rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Filter Jobs</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="col-span-2 flex items-center gap-2 rounded-xl border px-3 py-2">
            <SearchIcon className="h-4 w-4 opacity-70" />
            <input
              className="w-full outline-none"
              placeholder="Search customer, address, Simpro #, numbers, services…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
            <span className="text-xs text-gray-600">Stage</span>
            <select
              className="w-full"
              value={fltStage}
              onChange={(e) => setFltStage(e.target.value as any)}
            >
              <option>All</option>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end">
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => {
                setQ("");
                setFltStage("All");
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {/* Main view */}
      {view === "kanban" ? (
        <Kanban
          jobs={filteredJobs}
          onMove={(id: string, to: Stage) => moveJob(id, to)}
          onOpen={(j: Job) => onOpenJob(j)}
          onDelete={(id: string) => removeJob(id)}
        />
      ) : (
        <section className="overflow-x-auto rounded-2xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left text-xs uppercase text-gray-700">
              <tr>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Simpro #</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Primary #</th>
                <th className="px-3 py-2">Numbers</th>
                <th className="px-3 py-2">Services</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((j) => {
                const numbersText = j.numbersList?.length ? j.numbersList.join(", ") : "–";
                const serviceText = j.services?.length
                  ? j.services.map((l) => `${l.name} x${l.qty}`).join(", ")
                  : "–";
                return (
                  <tr key={j.id} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      <button
                        className="rounded px-1 py-0.5 hover:bg-gray-50"
                        onClick={() => onOpenJob(j)}
                        title="Open"
                      >
                        {j.customer}
                      </button>
                    </td>
                    <td className="px-3 py-2">{j.status}</td>
                    <td className="px-3 py-2">{j.reference || "–"}</td>
                    <td className="px-3 py-2">{j.address || "–"}</td>
                    <td className="px-3 py-2">{j.primaryNumber || "–"}</td>
                    <td className="px-3 py-2">{numbersText}</td>
                    <td className="px-3 py-2">{serviceText}</td>
                    <td className="px-3 py-2">
                      <button
                        className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-red-50"
                        onClick={() => removeJob(j.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                    No jobs match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* Drawers */}
      <AddJobDrawerInline open={addOpen} onClose={() => setAddOpen(false)} />

      <JobDrawerInline
        job={selected}
        open={open}
        onClose={() => setOpen(false)}
        onUpdate={(patch: Partial<Job>) => selected && updateJob(selected.id, patch)}
      />
    </div>
  );
}

