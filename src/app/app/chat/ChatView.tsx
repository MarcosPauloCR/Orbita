"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useOtherUserOnline } from "@/lib/presence/PresenceProvider";
import {
  sendMessage,
  sendPhotoMessage,
  markMessagesRead,
  type ChatMessage,
} from "./actions";

const CHAT_CHANNEL = "orbita-chat";

export function ChatView({
  currentUserId,
  otherUserId,
  otherUserName,
  initialMessages,
}: {
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSendingPhoto, setIsSendingPhoto] = useState(false);
  const isOnline = useOtherUserOnline();
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(CHAT_CHANNEL);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const message = payload as ChatMessage;
        if (message.from_user === currentUserId) return;
        setMessages((prev) => [...prev, message]);
      })
      .on("broadcast", { event: "read" }, ({ payload }) => {
        const { ids } = payload as { ids: string[] };
        setMessages((prev) =>
          prev.map((m) =>
            ids.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const unread = messages.filter(
      (m) => m.from_user === otherUserId && !m.read_at
    );
    if (unread.length === 0) return;

    const ids = unread.map((m) => m.id);
    markMessagesRead(ids).then(() => {
      setMessages((prev) =>
        prev.map((m) =>
          ids.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m
        )
      );
      channelRef.current?.send({
        type: "broadcast",
        event: "read",
        payload: { ids },
      });
    });
  }, [messages, otherUserId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setDraft("");

    startTransition(async () => {
      const result = await sendMessage(content);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setMessages((prev) => [...prev, result.data]);
      channelRef.current?.send({
        type: "broadcast",
        event: "message",
        payload: result.data,
      });
    });
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.set("photo", file);

    setIsSendingPhoto(true);
    try {
      const result = await sendPhotoMessage(formData);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setMessages((prev) => [...prev, result.data]);
      channelRef.current?.send({
        type: "broadcast",
        event: "message",
        payload: result.data,
      });
    } finally {
      setIsSendingPhoto(false);
    }
  }

  return (
    <div className="flex h-full w-full max-w-sm flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <span className="font-display text-lg text-ink">
          {otherUserName}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOnline ? "bg-green-500" : "bg-ink-muted/40"
            }`}
          />
          {isOnline ? "online" : "offline"}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.map((m) => {
          const isMine = m.from_user === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  isMine ? "bg-moon text-btn-ink" : "bg-surface text-ink"
                }`}
              >
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photoUrl}
                    alt=""
                    className="max-h-56 w-full rounded-lg object-cover"
                  />
                ) : (
                  <p>{m.content}</p>
                )}
                {isMine && (
                  <p className="mt-0.5 text-right text-[10px] opacity-60">
                    {m.read_at ? "✓✓ visto" : "✓ enviado"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {isSendingPhoto && (
          <div className="flex justify-end">
            <div className="rounded-2xl bg-moon px-4 py-2 text-xs text-btn-ink opacity-70">
              enviando foto…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-hairline pt-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSendingPhoto}
          className="rounded-full border border-hairline px-3 py-2 text-sm text-ink-muted disabled:opacity-50"
        >
          📎
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva algo..."
          className="flex-1 rounded-full border border-hairline bg-surface px-4 py-2 text-sm text-ink placeholder-ink-muted outline-none focus:border-ink-muted"
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          className="rounded-full bg-moon px-4 py-2 text-sm text-btn-ink disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
