"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  sharePhoto,
  markPhotosSeen,
  viewDisappearingPhoto,
  type PhotoUpdate,
} from "./actions";

const PHOTO_CHANNEL = "orbita-photos";

export function PhotoFeed({
  currentUserId,
  otherUserId,
  initialPhotos,
}: {
  currentUserId: string;
  otherUserId: string;
  initialPhotos: PhotoUpdate[];
}) {
  const [photos, setPhotos] = useState<PhotoUpdate[]>(initialPhotos);
  const [isSending, setIsSending] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openPicker(useCamera: boolean) {
    const input = fileInputRef.current;
    if (!input) return;
    if (useCamera) {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }
    input.click();
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(PHOTO_CHANNEL);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "photo" }, ({ payload }) => {
        const photo = payload as PhotoUpdate;
        if (photo.from_user === currentUserId) return;
        setPhotos((prev) => [photo, ...prev]);
      })
      .on("broadcast", { event: "photo-viewed" }, ({ payload }) => {
        const { id } = payload as { id: string };
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, read_at: new Date().toISOString() } : p
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    const unseen = photos.filter(
      (p) => p.from_user === otherUserId && !p.disappearing && !p.read_at
    );
    if (unseen.length === 0) return;
    markPhotosSeen(unseen.map((p) => p.id));
  }, [photos, otherUserId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) return;

    setIsSending(true);
    try {
      const photo = await sharePhoto(formData);
      setPhotos((prev) => [photo, ...prev]);
      channelRef.current?.send({
        type: "broadcast",
        event: "photo",
        payload: photo.disappearing ? { ...photo, url: null } : photo,
      });
      form.reset();
      setSelectedFile(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao enviar foto.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleReveal(id: string) {
    setRevealingId(id);
    try {
      const url = await viewDisappearingPhoto(id);
      setViewerUrl(url);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      channelRef.current?.send({
        type: "broadcast",
        event: "photo-viewed",
        payload: { id },
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao abrir foto.");
    } finally {
      setRevealingId(null);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-1 flex-col">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 border-b border-hairline pb-4"
      >
        <input
          ref={fileInputRef}
          type="file"
          name="photo"
          accept="image/*"
          className="hidden"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openPicker(true)}
            className="rounded-full bg-moon px-3 py-1.5 text-xs text-btn-ink"
          >
            📷 câmera
          </button>
          <button
            type="button"
            onClick={() => openPicker(false)}
            className="rounded-full border border-hairline px-3 py-1.5 text-xs text-ink"
          >
            🖼️ galeria
          </button>
        </div>
        {selectedFile && (
          <p className="text-xs text-ink-muted">{selectedFile.name}</p>
        )}
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input type="checkbox" name="disappearing" className="h-3.5 w-3.5" />
          some depois de vista
        </label>
        <button
          type="submit"
          disabled={isSending || !selectedFile}
          className="self-start rounded-full bg-moon px-4 py-2 text-xs text-btn-ink disabled:opacity-50"
        >
          {isSending ? "enviando…" : "enviar foto"}
        </button>
      </form>

      <div className="grid grid-cols-2 gap-2 py-4">
        {photos.map((photo) => {
          const isMine = photo.from_user === currentUserId;
          const locked = !photo.url;

          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => {
                if (locked) {
                  if (!isMine) handleReveal(photo.id);
                  return;
                }
                setViewerUrl(photo.url);
              }}
              className="relative aspect-square overflow-hidden rounded-xl border border-hairline bg-surface"
            >
              {locked ? (
                <span className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-ink-muted">
                  {revealingId === photo.id ? "abrindo…" : "🔥 toque para ver"}
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url!} alt="" className="h-full w-full object-cover" />
              )}
              {isMine && (
                <span className="absolute bottom-1 right-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] text-white">
                  {photo.read_at ? "vista" : photo.disappearing ? "aguardando" : "enviada"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {viewerUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewerUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewerUrl}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
