import type { Dashboard, Detail, GrowthItem, Note } from "./types";

const jsonHeaders = { "Content-Type": "application/json" };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => request<{ categories: string[]; archiveReasons: string[] }>("/api/meta"),
  dashboard: () => request<Dashboard>("/api/dashboard"),
  listItems: (status = "all", q = "") => request<GrowthItem[]>(`/api/growth-items?status=${status}&q=${encodeURIComponent(q)}`),
  detail: (id: string) => request<Detail>(`/api/growth-items/${id}/detail`),
  createItem: (payload: { title: string; description: string; category: string }) =>
    request<GrowthItem>("/api/growth-items", { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) }),
  updateItem: (id: string, payload: Record<string, unknown>) =>
    request<GrowthItem>(`/api/growth-items/${id}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(payload) }),
  deleteItem: (id: string) => request<{ ok: boolean }>(`/api/growth-items/${id}`, { method: "DELETE" }),
  createNote: (id: string, payload: { title: string; content: string }) =>
    request<Note>(`/api/growth-items/${id}/notes`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) }),
  updateNote: (noteId: string, payload: { title: string; content: string }) =>
    request<Note>(`/api/notes/${noteId}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(payload) }),
  deleteNote: (noteId: string) => request<{ ok: boolean }>(`/api/notes/${noteId}`, { method: "DELETE" }),
  confidence: (id: string, payload: { discussScore: number; applyScore: number; teachScore: number; note: string }) =>
    request(`/api/growth-items/${id}/confidence`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) }),
  upload: async (id: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request(`/api/growth-items/${id}/files`, { method: "POST", body });
  },
  search: (q: string) => request(`/api/search?q=${encodeURIComponent(q)}`),
};
