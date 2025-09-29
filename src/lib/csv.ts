import type { Job } from "./types";

const headers: (keyof Job)[] = [
  "id","customer","site","address","serviceType","carrier","reference","numbers","numbersList","amountEx","portDate","status","priority","assignedTo",
  "billingContactName","billingContactEmail","billingContactPhone","siteContactName","siteContactEmail","siteContactPhone",
  "notes","createdAt","updatedAt",
];

function esc(v: unknown): string {
  let s: string;
  if (Array.isArray(v)) s = v.map((x) => String(x ?? "")).join("|");
  else s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(rows: Job[]): string {
  const lines: string[] = [headers.join(",")];
  for (const r of rows) {
    const rowRec = r as Record<keyof Job, unknown>;
    lines.push(headers.map((h) => esc(rowRec[h])).join(","));
  }
  return lines.join("\n");
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current); current = ""; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

export async function fromCSVFile(file: File): Promise<Job[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headerLine = lines[0];
  const cols = headerLine.split(",");
  const idx = (h: keyof Job) => cols.indexOf(h as string);

  const out: Job[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCSVLine(line);
    const get = (h: keyof Job): string => cells[idx(h)] ?? "";
    const num = (h: keyof Job): number | undefined => {
      const v = get(h);
      return v ? Number(v) : undefined;
    };

    out.push({
      id: get("id") || crypto.randomUUID(),
      customer: get("customer"),
      site: get("site") || "",
      address: get("address") || "",
      serviceType: (get("serviceType") as Job["serviceType"]) || "Porting",
      carrier: get("carrier") || "",
      reference: get("reference") || "",
      numbers: get("numbers") || "",
      numbersList: get("numbersList") ? get("numbersList").split("|").filter(Boolean) : undefined,
      amountEx: num("amountEx"),
      portDate: get("portDate") || "",
      status: (get("status") as Job["status"]) || "In Tray",
      priority: (get("priority") as Job["priority"]) || "Normal",
      assignedTo: get("assignedTo") || "",
      billingContactName: get("billingContactName") || "",
      billingContactEmail: get("billingContactEmail") || "",
      billingContactPhone: get("billingContactPhone") || "",
      siteContactName: get("siteContactName") || "",
      siteContactEmail: get("siteContactEmail") || "",
      siteContactPhone: get("siteContactPhone") || "",
      notes: get("notes") || "",
      createdAt: get("createdAt") || new Date().toISOString().slice(0, 10),
      updatedAt: get("updatedAt") || new Date().toISOString().slice(0, 10),
    });
  }
  return out;
}
