"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PRESENCE_CHANNEL = "orbita-presence";

const OnlineStatusContext = createContext(false);

export function PresenceProvider({
  currentUserId,
  otherUserId,
  children,
}: {
  currentUserId: string;
  otherUserId: string;
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: currentUserId } },
    });

    function sync() {
      const state = channel.presenceState();
      setIsOnline(otherUserId in state);
    }

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, otherUserId]);

  return (
    <OnlineStatusContext.Provider value={isOnline}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOtherUserOnline() {
  return useContext(OnlineStatusContext);
}
