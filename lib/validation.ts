import { z } from "zod";
import { COLORS, MAX_TASK_TAGS, PRIORITY_IDS } from "@/lib/types";

const title = z.string().trim().min(1, "El título es obligatorio").max(120);
const description = z.string().trim().max(5000);
const color = z.enum(COLORS, "Color inválido").nullable();

export const credentialsSchema = z.object({
  email: z.email("Correo inválido").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña no puede superar 72 caracteres"),
});

export const loginSchema = z.object({
  email: z.email("Correo inválido").trim().toLowerCase(),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const profileSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,20}$/, "Número de celular inválido"),
  fullName: z.string().trim().min(2, "Ingresa tu nombre completo").max(120),
  alias: z
    .string()
    .trim()
    .min(2, "El alias debe tener al menos 2 caracteres")
    .max(30),
  birthDate: z.iso
    .date("Fecha inválida")
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

const priorityId = z.enum(PRIORITY_IDS, "Prioridad inv\u00e1lida");

export const taskCreateSchema = z.object({
  title,
  description: description.optional().default(""),
  tags: taskTagsSchema.optional().default([]),
  priorityId: priorityId.optional().default("none"),
  color: color.optional().default(null),
  assigneeId: z.string().nullable().optional().default(null),
});
export const taskUpdateSchema = z
  .object({
    title,
    description,
    tags: taskTagsSchema,
    priorityId,
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
