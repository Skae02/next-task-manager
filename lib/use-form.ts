"use client";

import { useState, type FormEvent } from "react";
import { ApiRequestError } from "@/lib/http";

/**
 * Minimal form state: values, server-side field errors and a submit wrapper
 * that maps ApiRequestError into `fieldErrors` / `formError`.
 */
export function useForm<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bind = (name: keyof T & string) => ({
    name,
    value: values[name],
    "aria-invalid": Boolean(fieldErrors[name]) || undefined,
    onChange: (event: { target: { value: string } }) => {
      setValues((v) => ({ ...v, [name]: event.target.value }));
      if (fieldErrors[name]) {
        setFieldErrors((errors) => {
          const next = { ...errors };
          delete next[name];
          return next;
        });
      }
    },
  });

  const submit = (fn: (values: T) => Promise<void>) => async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await fn(values);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setFieldErrors(error.fields);
        if (!Object.keys(error.fields).length || error.status >= 500) setFormError(error.message);
      } else {
        setFormError("No se pudo conectar con el servidor");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return { values, setValues, bind, submit, submitting, fieldErrors, formError };
}
