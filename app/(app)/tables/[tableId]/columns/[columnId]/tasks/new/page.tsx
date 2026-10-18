"use client";

import { useParams } from "next/navigation";
import { TaskEditor } from "@/components/board/task-editor";

export default function NewTaskPage() {
  const { tableId, columnId } = useParams<{ tableId: string; columnId: string }>();
  return <TaskEditor mode="create" tableId={tableId} columnId={columnId} />;
}
