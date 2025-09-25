export type Stage =
  | "In Tray"
  | "Scoping"
  | "Submitted to Carrier"
  | "Awaiting Carrier"
  | "Scheduled"
  | "Ready for Cutover"
  | "Complete"
  | "On Hold";

export const STAGES: Stage[] = [
  "In Tray",
  "Scoping",
  "Submitted to Carrier",
  "Awaiting Carrier",
  "Scheduled",
  "Ready for Cutover",
  "Complete",
  "On Hold",
];

// *All prices are ex GST*
export type JobServiceLine = {
  id: string;
  serviceId?: string;     // from Price Book
  name: string;
  unitPrice: number;      // ex GST
  qty: number;
  unitNote?: string;      // optional "per channel", etc.
};

export type Adjustment = {
  id: string;
  label: string;          // "Discount" or "Surcharge"
  amountEx: number;       // ex GST (negative for discount)
};

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;      // yyyy-mm-dd
};

export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;        // base64; local-only
  createdAt: string;      // yyyy-mm-dd
};

export type Job = {
  id: string;

  customer: string;
  site?: string;
  reference?: string;     // Simpro Job #
  address?: string;

  numbersList?: string[];
  primaryNumber?: string;

  status: Stage;

  // Contacts
  billingContactName?: string;
  billingContactEmail?: string;
  billingContactPhone?: string;

  siteContactName?: string;
  siteContactEmail?: string;
  siteContactPhone?: string;

  // Money
  services?: JobServiceLine[];  // ex GST
  adjustments?: Adjustment[];   // ex GST (may be negative)

  // Misc
  notes?: string;
  todos?: Todo[];
  attachments?: Attachment[];

  // Timestamps (local storage)
  createdAt?: string;
  updatedAt?: string;

  // Back-compat (not used any more)
  serviceType?: string;
};


