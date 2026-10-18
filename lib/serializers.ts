import type {
  Prisma,
  Column as DbColumn,
  Table as DbTable,
  Task as DbTask,
  User as DbUser,
} from "@/lib/generated/prisma/client";
import type { PublicUser, Column, TagColor, Task, UserRef } from "@/lib/types";

export function isProfileComplete(user: DbUser) {
  return Boolean(user.phone && user.fullName && user.alias && user.birthDate);
}

export function toPublicUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    alias: user.alias,
    birthDate: user.birthDate?.toISOString().slice(0, 10) ?? null,
    profileComplete: isProfileComplete(user),
  };
}

export const userRefSelect = { id: true, alias: true, fullName: true } as const;

/** Ties (e.g. tasks created concurrently) fall back to creation order. */
export const taskOrder: Prisma.TaskOrderByWithRelationInput[] = [{ position: "asc" }, { createdAt: "asc" }];

export const taskInclude = {
  author: { select: userRefSelect },
  assignee: { select: userRefSelect },
} as const;

type DbTaskWithUsers = DbTask & { author: UserRef; assignee: UserRef | null };

export function toTask(task: DbTaskWithUsers): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    tagLabel: task.tagLabel,
    tagColor: task.tagColor as TagColor | null,
    position: task.position,
    columnId: task.columnId,
    author: task.author,
    assignee: task.assignee,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function toColumn(column: DbColumn & { tasks?: DbTaskWithUsers[] }): Column {
  return {
    id: column.id,
    title: column.title,
    description: column.description,
    position: column.position,
    tableId: column.tableId,
    tasks: (column.tasks ?? []).map(toTask),
  };
}

export function toTableBase(table: DbTable) {
  return {
    id: table.id,
    title: table.title,
    description: table.description,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt.toISOString(),
  };
}
