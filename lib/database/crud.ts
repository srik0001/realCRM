import {
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
  type DataSnapshot,
  type Query,
} from "firebase/database";
import { db } from "@/lib/firebase/client";
import { compactForCreate, compactForUpdate } from "@/utils/object";

export function snapshotToList<T extends { id: string }>(snap: DataSnapshot): T[] {
  const list: T[] = [];
  snap.forEach((child) => {
    list.push({ ...(child.val() as Omit<T, "id">), id: child.key! } as T);
  });
  return list;
}

/** Subscribe to a list-shaped query. Returns the unsubscribe function. */
export function subscribeList<T extends { id: string }>(
  query: Query,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onValue(query, (snap) => onData(snapshotToList<T>(snap)), (err) => onError?.(err));
}

/** Create a record with server-side audit fields. Returns the new id. */
export async function createRecord<T extends object>(path: string, data: T, actorId: string): Promise<string> {
  const node = push(ref(db, path));
  await set(node, {
    ...compactForCreate(data),
    createdBy: actorId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return node.key!;
}

export async function updateRecord<T extends object>(path: string, id: string, data: T): Promise<void> {
  await update(ref(db, `${path}/${id}`), { ...compactForUpdate(data), updatedAt: serverTimestamp() });
}

export async function removeRecord(path: string, id: string): Promise<void> {
  await remove(ref(db, `${path}/${id}`));
}
