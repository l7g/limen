import { NextResponse } from "next/server";

/**
 * POST /api/refresh
 * Webhook endpoint for GitHub Actions to trigger on-demand revalidation.
 * Protected by a shared secret in the Authorization header.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.REFRESH_SECRET;

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In production, this would call revalidatePath/revalidateTag
  // to bust the cache for data-dependent pages.
  return NextResponse.json({ revalidated: true, timestamp: Date.now() });
}
