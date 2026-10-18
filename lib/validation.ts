import { z } from "zod";
import { TAG_COLORS } from "@/lib/types";

const title = z.string().trim().min(1, "El título es obligatorio").max(120);
const description = z.string().trim().max(5000);

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
});
export const tableUpdateSchema = z
  .object({ title, description })
  .partial();

export const columnCreateSchema = tableCreateSchema;
export const columnUpdateSchema = z
  .object({ title, description, position: z.int().min(0) })
  .partial();

const tag = {
  tagLabel: z.string().trim().max(30).nullable(),
  tagColor: z.enum(TAG_COLORS, "Color inválido").nullable(),
};

export const taskCreateSchema = z.object({
  title,
  description: description.optional().default(""),
  tagLabel: tag.tagLabel.optional().default(null),
  tagColor: tag.tagColor.optional().default(null),
  assigneeId: z.string().nullable().optional().default(null),
});
export const taskUpdateSchema = z
  .object({
    title,
    description,
    ...tag,
    assigneeId: z.string().nullable(),
    columnId: z.string(),
  })
  .partial();

/** Drag and drop: place the task at `index` (0-based) in `columnId`. */
export const taskMoveSchema = z.object({
  columnId: z.string().min(1),
  index: z.int().min(0),
})
