"use client";
import React from "react";
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import { STAGES, type Job, type Stage } from "../lib/types";
import { Trash2, GripVertical } from "lucide-react";

function Column({ title, children }: { title: Stage; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: title });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-3 min-h-[140px] ${isOver ? "ring-2 ring-blue-400" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DragHandle({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      aria-label="Drag job"
      className={`rounded p-1 hover:bg-gray-100 cursor-grab ${isDragging ? "cursor-grabbing" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="h-4 w-4 opacity-70" />
    </button>
  );
}

function currencyAUD(v: number) {
  try {
    return v.toLocaleString(undefined, { style: "currency", currency: "AUD" });
  } catch {
    return `$${v.toFixed(2)}`;
  }
}

function Card({
  job,
  onOpen,
  onDelete,
}: {
  job: Job;
  onOpen: (j: Job) => void;
  onDelete: (id: string) => void;
}) {
  const lines = job.services || [];
  const total = lines.reduce((sum, l) => sum + (l.unitPrice || 0) * (l.qty || 0), 0);

  return (
    <div className="rounded-xl border p-3 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onOpen(job)} className="text-left font-semibold hover:underline">
          {job.customer}
        </button>
        <div className="flex items-center gap-2">
          <DragHandle id={job.id} />
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-700">
        {job.status} • Simpro: {job.reference || "–"}
      </div>
      {job.address && <div className="mt-1 text-xs text-gray-600">{job.address}</div>}
      <div className="mt-2 text-xs text-gray-600">
        Lines: {lines.length || 0} • Total: {currencyAUD(total)}
      </div>
      <div className="mt-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-red-50"
          onClick={() => onDelete(job.id)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  );
}

export default function Kanban({
  jobs,
  onMove,
  onOpen,
  onDelete,
}: {
  jobs: Job[];
  onMove: (id: string, to: Stage) => void;
  onOpen: (j: Job) => void;
  onDelete: (id: string) => void;
}) {
  const jobsBy = (s: Stage) => jobs.filter((j) => j.status === s);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const to = e.over?.id as Stage | undefined;
    if (id && to) onMove(id, to);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {STAGES.map((stage) => (
          <Column key={stage} title={stage}>
            {jobsBy(stage).map((j) => (
              <Card key={j.id} job={j} onOpen={onOpen} onDelete={onDelete} />
            ))}
            {jobsBy(stage).length === 0 && (
              <div className="rounded-xl border border-dashed p-4 text-center text-sm text-gray-500">Drop here</div>
            )}
          </Column>
        ))}
      </div>
    </DndContext>
  );
}
