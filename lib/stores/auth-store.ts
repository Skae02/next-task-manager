"use client";

import { create } from "zustand";
import { api } from "@/lib/http";
import type { PublicUser } from "@/lib/types";

type Credentials = { email: string; password: string };
type Profile = { phone: string; fullName: string; alias: string; birthDate: string };

type AuthState = {
  user: PublicUser | null;
  status: "idle" | "loading" | "ready";
  fetchMe: () => Promise<void>;
  login: (credentials: Credentials) => Promise<PublicUser>;
  register: (credentials: Credentials) => Promise<PublicUser>;
  completeProfile: (profile: Profile) => Promise<PublicUser>;
  logout: () => Promise<void>;
};

type UserResponse = { user: PublicUser };

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  status: "idle",

  fetchMe: async () => {
    if (get().status === "loading") return;
    set({ status: "loading" });
    try {
      const { user } = await api<UserResponse>("/users/me");
      set({ user, status: "ready" });
    } catch {
      set({ user: null, status: "ready" });
    }
  },

  login: async (credentials) => {
    const { user } = await api<UserResponse>("/auth/login", {
      method: "POST",
      body: credentials,
    });
    set({ user, status: "ready" });
    return user;
  },

  register: async (credentials) => {
    const { user } = await api<UserResponse>("/auth/register", {
      method: "POST",
      body: credentials,
    });
    set({ user, status: "ready" });
    return user;
  },

  completeProfile: async (profile) => {
    const { user } = await api<UserResponse>("/users/me", {
      method: "PATCH",
      body: profile,
    });
    set({ user });
    return user;
  },

  logout: async () => {
    await api("/auth/logout", { method: "POST" });
    set({ user: null, status: "idle" });
  },
}));
