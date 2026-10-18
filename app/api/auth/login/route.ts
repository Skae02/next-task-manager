import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { HttpError, handler, parseBody, setSessionCookie } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { isProfileComplete, toPublicUser } from "@/lib/serializers";

// Compared against when the email is unknown, so both paths take similar time.
let dummyHash: Promise<string> | undefined;

export const POST = handler(async (request) => {
  const { email, password } = await parseBody(request, loginSchema);

  const user = await db.user.findUnique({ where: { email } });
  dummyHash ??= hashPassword("timing-safe-placeholder");
  const valid = await verifyPassword(
    password,
    user?.passwordHash ?? (await dummyHash),
  );
  if (!user || !valid) {
    throw new HttpError(401, "Correo o contraseña incorrectos");
  }

  await setSessionCookie({
    userId: user.id,
    profileComplete: isProfileComplete(user),
  });
  return Response.json({ user: toPublicUser(user) });
});
