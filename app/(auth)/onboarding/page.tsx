"use client";

import { useRouter } from "next/navigation";
import { StepIndicator } from "@/components/auth/step-indicator";
import { Button, Field, FormError, Input } from "@/components/ui";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useForm } from "@/lib/use-form";

export default function OnboardingPage() {
  const router = useRouter();
  const { completeProfile, logout } = useAuthStore();
  const { bind, submit, submitting, fieldErrors, formError } = useForm({
    fullName: "",
    alias: "",
    phone: "",
    birthDate: "",
  });

  const onSubmit = submit(async (values) => {
    await completeProfile(values);
    router.replace("/tables");
  });

  const cancel = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <>
      <StepIndicator step={2} />
      <h1 className="text-[20px] font-semibold tracking-tight">Cuéntanos de ti</h1>
      <p className="mt-1 mb-6 text-muted">Solo un par de datos más para terminar.</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={formError} />
        <Field label="Nombre completo" error={fieldErrors.fullName}>
          {(id) => <Input id={id} autoComplete="name" autoFocus placeholder="Ada Lovelace" {...bind("fullName")} />}
        </Field>
        <Field label="Alias" error={fieldErrors.alias}>
          {(id) => <Input id={id} autoComplete="nickname" placeholder="ada" {...bind("alias")} />}
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Celular" error={fieldErrors.phone}>
            {(id) => <Input id={id} type="tel" autoComplete="tel" placeholder="+51 999 999 999" {...bind("phone")} />}
          </Field>
          <Field label="Fecha de nacimiento" error={fieldErrors.birthDate}>
            {(id) => <Input id={id} type="date" autoComplete="bday" {...bind("birthDate")} />}
          </Field>
        </div>
        <Button type="submit" variant="primary" className="mt-2 justify-center" loading={submitting}>
          Terminar registro
        </Button>
        <Button type="button" variant="ghost" className="justify-center" onClick={cancel}>
          Salir
        </Button>
      </form>
    </>
  );
}
