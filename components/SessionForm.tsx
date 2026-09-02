"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Session, Photo } from "@/lib/supabase";
import { sessionHours, driveThumbnailUrl } from "@/lib/hours";
import { X, Camera, Loader, AlertCircle } from "lucide-react";

type FormValues = {
  work_date: string;
  time_in: string;
  time_out: string;
  lunch_minutes: number;
  notes: string;
  photos: Photo[];
};

interface Props {
  initial?: Session;
  onSave: (values: FormValues) => Promise<void>;
  onCancel: () => void;
  onPhotosUpdate?: (sessionId: number, photos: Photo[]) => Promise<void>;
}

function getDefaultValues(): FormValues {
  const now = new Date();
  return {
    work_date: format(now, "yyyy-MM-dd"),
    time_in: format(now, "HH:mm"),
    time_out: "18:00",
    lunch_minutes: 60,
    notes: "",
    photos: [],
  };
}

export default function SessionForm({ initial, onSave, onCancel, onPhotosUpdate }: Props) {
  const [values, setValues] = useState<FormValues>(() =>
    initial
      ? {
          work_date: initial.work_date,
          time_in: initial.time_in,
          time_out: initial.time_out,
          lunch_minutes: initial.lunch_minutes,
          notes: initial.notes,
          photos: initial.photos ?? [],
        }
      : getDefaultValues()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [photos, setPhotos] = useState<Photo[]>(initial?.photos ?? []);

  const preview = sessionHours({ ...values } as Session);

  function set<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setValues(prev => ({ ...prev, [k]: v }));
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    setUploadError("");
    setUploading(true);

    try {
      // Validate file sizes on client before uploading
      const maxSize = 10 * 1024 * 1024; // 10MB
      for (const file of Array.from(files)) {
        if (file.size > maxSize) {
          throw new Error(
            `File "${file.name}" exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`
          );
        }
      }

      const formData = new FormData();
      if (initial?.id) {
        formData.append("sessionId", initial.id.toString());
      }
      formData.append("workDate", values.work_date);

      for (const file of Array.from(files)) {
        formData.append("files", file);
      }

      const response = await fetch("/api/drive-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      const newPhotos = [...photos, ...result.photos];
      setPhotos(newPhotos);
      setValues(prev => ({ ...prev, photos: newPhotos }));

      // If editing an existing session, save photos immediately
      if (initial?.id && onPhotosUpdate) {
        await onPhotosUpdate(initial.id, newPhotos);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset input safely in case the input is already unmounted or missing
      if (e.currentTarget) {
        e.currentTarget.value = "";
      }
    }
  }

  async function handleDeletePhoto(driveFileId: string) {
    if (!driveFileId) return;

    setUploadError("");
    setUploading(true);

    try {
      const response = await fetch("/api/drive-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveFileId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }

      const nextPhotos = photos.filter(photo => photo.driveFileId !== driveFileId);
      setPhotos(nextPhotos);
      setValues(prev => ({ ...prev, photos: nextPhotos }));

      if (initial?.id && onPhotosUpdate) {
        await onPhotosUpdate(initial.id, nextPhotos);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSave(values);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-xl p-5 space-y-4 animate-slide-up"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-sm text-soft uppercase tracking-widest">
          {initial ? "Edit session" : "Log session"}
        </h3>
        <button type="button" onClick={onCancel} className="text-muted hover:text-text transition-colors p-1 rounded">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs text-muted font-mono uppercase tracking-wider">Date</label>
          <input
            type="date"
            value={values.work_date}
            onChange={e => set("work_date", e.target.value)}
            required
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted font-mono uppercase tracking-wider">Time in</label>
          <input
            type="time"
            value={values.time_in}
            onChange={e => set("time_in", e.target.value)}
            required
            className="input font-mono"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted font-mono uppercase tracking-wider">Time out</label>
          <input
            type="time"
            value={values.time_out}
            onChange={e => set("time_out", e.target.value)}
            required
            className="input font-mono"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted font-mono uppercase tracking-wider">Lunch (min)</label>
          <input
            type="number"
            min={0}
            step={5}
            value={values.lunch_minutes}
            onChange={e => set("lunch_minutes", Number(e.target.value))}
            required
            className="input font-mono"
          />
        </div>
        <div className="flex items-end pb-0.5">
          <span className="font-mono text-accent font-semibold text-lg">
            {preview.toFixed(1)}
            <span className="text-xs text-muted ml-1">hrs computed</span>
          </span>
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs text-muted font-mono uppercase tracking-wider">Notes</label>
          <textarea
            rows={2}
            placeholder="what you worked on…"
            value={values.notes}
            onChange={e => set("notes", e.target.value)}
            className="input resize-none"
          />
        </div>
      </div>

      {/* Photo upload section */}
      <div className="border-t border-border pt-4 space-y-3">
        {photos.length > 0 && (
          <div>
            <p className="text-xs font-mono text-muted uppercase tracking-wider mb-2">
              Photos ({photos.length})
            </p>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((photo) => (
                <div key={photo.driveFileId} className="relative group">
                  <a
                    href={photo.webViewLink || "#"}
                    target={photo.webViewLink ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden bg-border border border-border/50 hover:border-accent/50 transition-colors"
                    title="Click to view in Google Drive"
                  >
                    <div className="relative h-full w-full">
                      {/* Drive thumbnail URLs are stable and do not expire like stored thumbnailLink values. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={driveThumbnailUrl(photo.driveFileId)}
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

                      <div
                        data-fallback
                        className="hidden absolute inset-0 items-center justify-center text-lg text-muted bg-border/70"
                        aria-label="Photo unavailable"
                      >
                        🖼️
                      </div>
                    </div>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.driveFileId)}
                    disabled={uploading}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-xs font-bold text-white border border-surface shadow-md opacity-90 hover:opacity-100 transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Delete photo"
                    title="Delete photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadError && (
          <div className="p-2 rounded-lg bg-danger/10 border border-danger/40 flex gap-2 text-xs text-danger">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        <label className="block">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={uploading}
            className="hidden"
            aria-label="Upload photos"
          />
          <button
            type="button"
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              input?.click();
            }}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg bg-accent/10 border border-accent/40 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader size={14} className="animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Camera size={14} />
                Add photos
              </>
            )}
          </button>
        </label>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? "Saving…" : initial ? "Save changes" : "Save session"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost px-4">
          Cancel
        </button>
      </div>
    </form>
  );
}
