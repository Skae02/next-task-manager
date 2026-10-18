import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { HttpError, handler, parseBody, setSessionCookie } from "@/lib/api";
import { credentialsSchema } from "@/lib/validation";
import { toPublicUser } from "@/lib/serializers";

// Step 1 of registration: email + password. Step 2 is PATCH /api/users/me.
export const POST = handler(async (request) => {
  const { email, password } = await parseBody(request, credentialsSchema);

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "Ese correo ya está registrado", {
      email: "Ese correo ya está registrado",
    });
  }

  const user = await db.user.create({
    data: { email, passwordHash: await hashPassword(password) },
  });

  await setSessionCookie({ userId: user.id, profileComplete: false });
  return Response.json({ user: toPublicUser(user) }, { status: 201 });
});
