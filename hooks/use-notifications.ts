"use client";

import { useEffect, useState } from "react";
import { limitToLast, query, ref, update } from "firebase/database";
import { db } from "@/lib/firebase/client";
import { PATHS } from "@/lib/database/paths";
import { subscribeList } from "@/lib/database/crud";
import type { AppNotification } from "@/types";

export function useNotifications(userId: string) {
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    const q = query(ref(db, `${PATHS.notifications}/${userId}`), limitToLast(30));
    return subscribeList<AppNotification>(q, (list) => setItems(list.sort((a, b) => b.createdAt - a.createdAt)));
  }, [userId]);

  const markAllRead = async () => {
    const updates: Record<string, boolean> = {};
    items.filter((n) => !n.read).forEach((n) => (updates[`${n.id}/read`] = true));
    if (Object.keys(updates).length) await update(ref(db, `${PATHS.notifications}/${userId}`), updates);
  };

  const markRead = async (id: string) => {
    await update(ref(db, `${PATHS.notifications}/${userId}/${id}`), { read: true });
  };

  return { items, unread: items.filter((n) => !n.read).length, markRead, markAllRead };
}
