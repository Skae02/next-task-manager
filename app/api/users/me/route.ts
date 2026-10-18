import { db } from "@/lib/db";
import {
  clearSessionCookie,
  handler,
  notFound,
  parseBody,
  requireUserId,
  setSessionCookie,
} from "@/lib/api";
import { profileSchema } from "@/lib/validation";
import { toPublicUser } from "@/lib/serializers";

const options = { allowIncompleteProfile: true };

export const GET = handler(async () => {
  const userId = await requireUserId(options);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("Usuario no encontrado");
  return Response.json({ user: toPublicUser(user) });
});

// Step 2 of registration, and later profile edits.
export const PATCH = handler(async (request) => {
  const userId = await requireUserId(options);
  const data = await parseBody(request, profileSchema);

  const user = await db.user.update({
    where: { id: userId },
    data: { ...data, birthDate: new Date(data.birthDate) },
  });

  await setSessionCookie({ userId, profileComplete: true });
  return Response.json({ user: toPublicUser(user) });
});

// Deletes the account and, through cascades, all of its tables, columns and tasks.
export const DELETE = handler(async () => {
  const userId = await requireUserId(options);
  await db.user.delete({ where: { id: userId } });
  await clearSessionCookie();
  return new Response(null, { status: 204 });
});
