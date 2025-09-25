import type { Job, ServiceType, Stage } from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

export function toCSV(rows: Job[]) {
  const headers = [
    "id","customer","serviceType","reference","numbersList","status"
  ];
  const esc = (v: any) => {
    if (Array.isArray(v)) v = v.join("|");
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    const row: any = {
      ...r,
      numbersList: (r.numbersList || []).join("|"),
    };
    lines.push(headers.map(h => esc(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function fromCSVFile(file: File): Promise<Job[]> {
  const text = await file.text();
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(",");
  const idx = (h: string) => headers.indexOf(h);
  const out: Job[] = [];
  for (const line of lines) {
    const c = parseCSVLine(line);
    out.push({
      id: c[idx("id")] || uid(),
      customer: c[idx("customer")] || "",
      serviceType: (c[idx("serviceType")] as ServiceType) || "Porting",
      reference: c[idx("reference")] || undefined,
      numbersList: c[idx("numbersList")] ? c[idx("numbersList")].split("|").filter(Boolean) : [],
      status: (c[idx("status")] as Stage) || "In Tray",
    });
  }
  return out;
}

export function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { q = false; }
      else cur += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}
