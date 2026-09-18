const TOKEN = "yiyi.token";

export function token() {
  return localStorage.getItem(TOKEN) || "";
}

export function setToken(t: string) {
  localStorage.setItem(TOKEN, t);
}

export function clearToken() {
  localStorage.removeItem(TOKEN);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token()) headers.set("Authorization", `Bearer ${token()}`);
  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "请求失败");
  return data as T;
}
