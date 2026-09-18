import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api, clearToken, setToken, token } from "../api";

export const useAuth = defineStore("auth", () => {
  const email = ref("");
  const ready = ref(false);

  const loggedIn = computed(() => !!token() && !!email.value);

  async function hydrate() {
    if (!token()) {
      ready.value = true;
      return;
    }
    try {
      const me = await api<{ email: string }>("/api/me");
      email.value = me.email;
    } catch {
      clearToken();
    }
    ready.value = true;
  }

  async function login(payload: { email: string; password: string }) {
    const out = await api<{ token: string; user: { email: string } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(out.token);
    email.value = out.user.email;
  }

  async function register(payload: { email: string; password: string }) {
    const out = await api<{ token: string; user: { email: string } }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(out.token);
    email.value = out.user.email;
  }

  function logout() {
    clearToken();
    email.value = "";
  }

  return { email, ready, loggedIn, hydrate, login, register, logout };
});
