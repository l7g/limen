import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Limen — Dati aperti italiani";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        backgroundColor: "#111827",
        padding: "60px 80px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Icon + Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
        <svg
          width="80"
          height="80"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="512" height="512" rx="90" fill="#1f2937" />
          <path
            d="M176 100 V412 H352"
            stroke="#00D9A3"
            strokeWidth="52"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span
          style={{
            fontSize: "72px",
            fontWeight: 700,
            color: "white",
            letterSpacing: "-1px",
          }}
        >
          Limen
        </span>
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: "32px",
          color: "#9ca3af",
          marginTop: "24px",
          lineHeight: 1.3,
        }}
      >
        Dati aperti italiani, finalmente in un unico posto
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: "32px",
          marginTop: "40px",
          fontSize: "22px",
          color: "#00D9A3",
        }}
      >
        <span>20 dataset</span>
        <span style={{ color: "#4b5563" }}>·</span>
        <span>7 indicatori derivati</span>
        <span style={{ color: "#4b5563" }}>·</span>
        <span>7.900 comuni</span>
      </div>

      {/* URL */}
      <div style={{ fontSize: "20px", color: "#4b5563", marginTop: "16px" }}>
        limen.city
      </div>

      {/* Bottom accent */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "8px",
          backgroundColor: "#00D9A3",
        }}
      />
    </div>,
    { ...size },
  );
}
