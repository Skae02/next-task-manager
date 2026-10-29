import { z } from "zod";
import { COLORS, MAX_TASK_TAGS } from "@/lib/types";

const title = z.string().trim().min(1, "El tÃ­tulo es obligatorio").max(120);
const description = z.string().trim().max(5000);
const color = z.enum(COLORS, "Color invÃ¡lido").nullable();

export const credentialsSchema = z.object({
  email: z.email("Correo invÃ¡lido").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "La contraseÃ±a debe tener al menos 8 caracteres")
    .max(72, "La contraseÃ±a no puede superar 72 caracteres"),
});

export const loginSchema = z.object({
  email: z.email("Correo invÃ¡lido").trim().toLowerCase(),
  password: z.string().min(1, "Ingresa tu contraseÃ±a"),
});

export const profileSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,20}$/, "NÃºmero de celular invÃ¡lido"),
  fullName: z.string().trim().min(2, "Ingresa tu nombre completo").max(120),
  alias: z
    .string()
    .trim()
    .min(2, "El alias debe tener al menos 2 caracteres")
    .max(30),
  birthDate: z.iso
    .date("Fecha invÃ¡lida")
    .refine((value) => new Date(value) < new Date(), "La fecha debe ser pasada"),
});

export const tableCreateSchema = z.object({
  title,
  description: description.optional().default(""),
  color: color.optional().default(null),
});
export const tableUpdateSchema = z
  .object({ title, description, color })
  .partial();

export const columnCreateSchema = tableCreateSchema;
export const columnUpdateSchema = z
  .object({ title, description, color, position: z.int().min(0) })
  .partial();

export const taskTagsSchema = z.array(z.object({
  label: z.string().trim().min(1, "El nombre es obligatorio").max(30, "Máximo 30 caracteres"),
  color,
})).max(MAX_TASK_TAGS, "Máximo 20 etiquetas por tarea").superRefine((tags, ctx) => {
  const seen = new Set<string>();
  tags.forEach((tag, index) => {
    const key = tag.label.toLocaleLowerCase("es");
    if (seen.has(key)) ctx.addIssue({ code: "custom", path: [index, "label"], message: "Esta etiqueta ya existe" });
    seen.add(key);
  });
});

export const taskCreateSchema = z.object({
  title,
  description: description.optional().default(""),
  tags: taskTagsSchema.optional().default([]),
  color: color.optional().default(null),
  assigneeId: z.string().nullable().optional().default(null),
});
export const taskUpdateSchema = z
  .object({
    title,
    description,
    tags: taskTagsSchema,
    color,
    assigneeId: z.string().nullable(),
    columnId: z.string(),
  })
  .partial();

/** Drag and drop: place the task at `index` (0-based) in `columnId`. */
export const taskMoveSchema = z.object({
  columnId: z.string().min(1),
  index: z.int().min(0),
})
