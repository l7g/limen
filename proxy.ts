// proxy.ts
// Metti questo file nella ROOT del progetto (al posto di middleware.ts)

import { NextRequest, NextResponse } from "next/server";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignora risorse statiche e API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Fire-and-forget: non blocca il caricamento della pagina
  const baseUrl = req.nextUrl.origin;
  fetch(`${baseUrl}/api/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page: pathname }),
  }).catch(() => {});

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
