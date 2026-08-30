"use client";

import { useState } from "react";
import { Session } from "@/lib/supabase";
import { sessionHours, fmtDate } from "@/lib/hours";
import { Pencil, Trash2 } from "lucide-react";
import SessionForm from "./SessionForm";

interface Props {
  session: Session;
  onUpdate: (id: number, values: Omit<Session, "id" | "created_at">) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function SessionCard({ session, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hours = sessionHours(session);
  
  // Handle sessions that don't have photos column yet (before migration)
  const photos = session.photos ?? [];

  async function handleDelete() {
    if (!confirm("Delete this session?")) return;
    setDeleting(true);
    await onDelete(session.id);
  }

  if (editing) {
    return (
      <SessionForm
        initial={session}
        onSave={async (values) => {
          await onUpdate(session.id, {
            work_date: values.work_date,
            time_in: values.time_in,
            time_out: values.time_out,
            lunch_minutes: values.lunch_minutes,
            notes: values.notes,
            photos: photos,
          });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        onPhotosUpdate={async (sessionId, newPhotos) => {
          // Refresh by calling onUpdate with current form values + new photos
          await onUpdate(sessionId, {
            work_date: session.work_date,
            time_in: session.time_in,
            time_out: session.time_out,
            lunch_minutes: session.lunch_minutes,
            notes: session.notes,
            photos: newPhotos,
          });
        }}
      />
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden animate-fade-in group hover:border-accent/30 transition-colors">
      {/* Main session info */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* left accent bar */}
        <div className="w-1 h-10 rounded-full bg-accent/60 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium text-soft">{fmtDate(session.work_date)}</span>
            <span className="font-mono text-xs text-muted">
              {session.time_in}–{session.time_out}
            </span>
          </div>
          {session.notes && (
            <p className="text-xs text-muted mt-0.5 truncate">{session.notes}</p>
          )}
        </div>

        <div className="font-mono font-semibold text-accent shrink-0">
          {hours.toFixed(1)}h
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-border transition-colors"
            aria-label="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

{/* Photo thumbnails only - no upload in card view */}
      {photos.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-2">
            Photos ({photos.length})
          </p>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((photo) => (
              <a
                key={photo.driveFileId}
                href={photo.webViewLink || "#"}
                target={photo.webViewLink ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="block aspect-square rounded-lg overflow-hidden bg-border border border-border/50 hover:border-accent/50 transition-colors"
                title="Click to view in Google Drive"
              >
                <div className="relative h-full w-full">
                  {photo.thumbnailLink ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.thumbnailLink}
                      alt="Session photo"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(event) => {
                        const image = event.currentTarget;
                        image.style.display = "none";
                        const fallback = image.parentElement?.querySelector("[data-fallback]") as HTMLElement | null;
                        if (fallback) {
                          fallback.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}

                  <div
                    data-fallback
                    className="hidden absolute inset-0 items-center justify-center text-lg text-muted bg-border/70"
                    aria-label="Photo unavailable"
                  >
                    🖼️
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
