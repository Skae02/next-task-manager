"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Field, FormError, Input } from "@/components/ui";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useForm } from "@/lib/use-form";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { bind, submit, submitting, fieldErrors, formError } = useForm({ email: "", password: "" });

  const onSubmit = submit(async (values) => {
    const user = await login(values);
    router.replace(user.profileComplete ? "/tables" : "/onboarding");
  });

  return (
    <>
      <h1 className="text-[20px] font-semibold tracking-tight">Inicia sesión</h1>
      <p className="mt-1 mb-6 text-muted">Bienvenido de nuevo.</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={formError} />
        <Field label="Correo" error={fieldErrors.email}>
          {(id) => <Input id={id} type="email" autoComplete="email" autoFocus placeholder="tu@correo.com" {...bind("email")} />}
        </Field>
        <Field label="Contraseña" error={fieldErrors.password}>
          {(id) => <Input id={id} type="password" autoComplete="current-password" placeholder="••••••••" {...bind("password")} />}
        </Field>
        <Button type="submit" variant="primary" className="mt-2 justify-center" loading={submitting}>
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Regístrate
        </Link>
      </p>
    </>
  );
}
