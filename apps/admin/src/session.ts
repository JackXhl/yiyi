const TOKEN = "yiyi.admin";
const EMAIL = "yiyi.admin.email";
const PERMS = "yiyi.admin.perms";

export function setAdminSession(token: string, email: string, permissions: string[]) {
  localStorage.setItem(TOKEN, token);
  localStorage.setItem(EMAIL, email);
  localStorage.setItem(PERMS, JSON.stringify(permissions));
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(EMAIL);
  localStorage.removeItem(PERMS);
}

export function adminToken() {
  return localStorage.getItem(TOKEN) || "";
}

export function adminEmail() {
  return localStorage.getItem(EMAIL) || "";
}

export function adminPermissions(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PERMS) || "[]");
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}

export function saveAdminPermissions(permissions: string[]) {
  localStorage.setItem(PERMS, JSON.stringify(permissions));
}
