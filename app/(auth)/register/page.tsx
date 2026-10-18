"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StepIndicator } from "@/components/auth/step-indicator";
import { Button, Field, FormError, Input } from "@/components/ui";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useForm } from "@/lib/use-form";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const { bind, submit, submitting, fieldErrors, formError } = useForm({
    email: "",
    password: "",
    confirm: "",
  });
  const [mismatch, setMismatch] = useState(false);

  const onSubmit = submit(async ({ email, password, confirm }) => {
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    await register({ email, password });
    router.replace("/onboarding");
  });

  return (
    <>
      <StepIndicator step={1} />
      <h1 className="text-[20px] font-semibold tracking-tight">Crea tu cuenta</h1>
      <p className="mt-1 mb-6 text-muted">Empieza con tu correo y una contraseña.</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={formError} />
        <Field label="Correo" error={fieldErrors.email}>
          {(id) => <Input id={id} type="email" autoComplete="email" autoFocus placeholder="tu@correo.com" {...bind("email")} />}
        </Field>
        <Field label="Contraseña" error={fieldErrors.password} hint="Mínimo 8 caracteres">
          {(id) => <Input id={id} type="password" autoComplete="new-password" {...bind("password")} />}
        </Field>
        <Field label="Confirmar contraseña" error={mismatch ? "Las contraseñas no coinciden" : undefined}>
          {(id) => <Input id={id} type="password" autoComplete="new-password" {...bind("confirm")} aria-invalid={mismatch || undefined} />}
        </Field>
        <Button type="submit" variant="primary" className="mt-2 justify-center" loading={submitting}>
          Continuar
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
