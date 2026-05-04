// app/api/track/route.ts
// Versione aggiornata con geolocalizzazione automatica

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function getGeoData(ip: string) {
  try {
    // ip-api.com gratuito, 45 richieste/minuto
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org,lat,lon,timezone`,
    );
    const data = await res.json();
    if (data.status === "success") return data;
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const userAgent = req.headers.get("user-agent") || "unknown";
    const referer = req.headers.get("referer") || "direct";
    const body = await req.json();

    // Geolocalizzazione automatica
    const geo = await getGeoData(ip);

    const { error } = await supabase.from("visits").insert([
      {
        ip_address: ip,
        user_agent: userAgent,
        page: body.page || "/",
        referer: referer,
        timestamp: new Date().toISOString(),

        // Dati geo
        country: geo?.country || null,
        region: geo?.regionName || null,
        city: geo?.city || null,
        isp: geo?.isp || null, // Provider internet (es. "TIM", "Vodafone")
        org: geo?.org || null,
        latitude: geo?.lat || null,
        longitude: geo?.lon || null,
        timezone: geo?.timezone || null,
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Tracking error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
