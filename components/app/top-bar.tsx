"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoutIcon } from "@/components/icons";
import { Avatar, Button } from "@/components/ui";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BrandLogo } from "@/components/app/brand-logo";


export function TopBar() {
  const router = useRouter();
  const { user, status, fetchMe, logout } = useAuthStore();

  useEffect(() => {
    if (status === "idle") fetchMe();
  }, [status, fetchMe]);

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-13 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/tables" className="flex items-center gap-2 font-semibold tracking-tight">
          <BrandLogo />
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <div className="flex items-center gap-2 pr-1">
              <Avatar name={user.fullName ?? user.email} size={26} />
              <div className="hidden leading-tight sm:block">
                <div className="text-[13px] font-medium">{user.alias ?? user.email}</div>
                <div className="text-[11.5px] text-muted">{user.email}</div>
              </div>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogoutIcon />
          </Button>
        </div>
      </div>
    </header>
  );
}
