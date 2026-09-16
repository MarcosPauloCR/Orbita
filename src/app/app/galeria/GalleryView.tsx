"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import GrainyCarousel from "@/components/GrainyCarousel";
import { uploadGalleryPhoto, deleteGalleryPhoto, type GalleryPhoto } from "./actions";

const GALLERY_CHANNEL = "orbita-galeria";

export function GalleryView({
  currentUserId,
  initialPhotos,
}: {
  currentUserId: string;
  initialPhotos: GalleryPhoto[];
}) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos);
  const [isSending, setIsSending] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFullscreen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFullscreen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(GALLERY_CHANNEL);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "added" }, ({ payload }) => {
        const photo = payload as GalleryPhoto;
        if (photo.from_user === currentUserId) return;
        setPhotos((prev) => [photo, ...prev]);
      })
      .on("broadcast", { event: "deleted" }, ({ payload }) => {
        const { id } = payload as { id: string };
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  function openPicker(useCamera: boolean) {
    const input = fileInputRef.current;
    if (!input) return;
    if (useCamera) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    setIsSending(true);
    try {
      const result = await uploadGalleryPhoto(formData);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setPhotos((prev) => [result.data, ...prev]);
      channelRef.current?.send({ type: "broadcast", event: "added", payload: result.data });
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar essa foto? Não tem como desfazer.")) return;

    const result = await deleteGalleryPhoto(id);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    channelRef.current?.send({ type: "broadcast", event: "deleted", payload: { id } });
  }

  const photoUrls = photos.map((p) => p.url);
  const myPhotos = photos.filter((p) => p.from_user === currentUserId);

  return (
    <div className="flex w-full max-w-sm flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden min-h-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => openPicker(true)} disabled={isSending} className="btn-primary">
          📷 câmera
        </button>
        <button type="button" onClick={() => openPicker(false)} disabled={isSending} className="btn-secondary">
          🖼️ galeria
        </button>
        {isSending && <span className="text-xs text-ink-muted">enviando…</span>}
      </div>

      {photos.length === 0 ? (
        <p className="text-center text-xs text-ink-muted">nenhuma foto ainda</p>
      ) : (
        <div className="card-flush relative h-80 w-full">
          <GrainyCarousel
            images={photoUrls}
            background="transparent"
            cardWidth={190}
            cardHeight={260}
            gap={14}
            rounded={12}
            style={{ minWidth: 0, minHeight: 0, width: "100%", height: "100%" }}
          />
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            aria-label="ver em tela cheia"
            className="glass absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-ink transition hover:bg-surface-strong"
          >
            ⛶
          </button>
        </div>
      )}

      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-canvas">
          <GrainyCarousel
            images={photoUrls}
            background="transparent"
            cardWidth={280}
            cardHeight={400}
            gap={20}
            rounded={12}
            style={{ minWidth: 0, minHeight: 0, width: "100%", height: "100%" }}
          />
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            aria-label="fechar tela cheia"
            className="glass absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-lg text-ink transition hover:bg-surface-strong"
            style={{ top: "max(1rem, env(safe-area-inset-top))" }}
          >
            ✕
          </button>
        </div>
      )}

      {myPhotos.length > 0 && (
        <div className="flex flex-col gap-2 pb-4">
          <h3 className="section-label">suas fotos</h3>
          {myPhotos.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-2xl border border-hairline bg-surface px-3.5 py-2 text-xs text-ink-muted"
            >
              <span className="chip font-mono">
                {new Date(p.created_at).toLocaleDateString("pt-BR")}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition hover:bg-danger-soft hover:text-danger"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
