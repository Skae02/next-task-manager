import { clearSessionCookie, handler } from "@/lib/api";

export const POST = handler(async () => {
  await clearSessionCookie();
  return new Response(null, { status: 204 });
});
