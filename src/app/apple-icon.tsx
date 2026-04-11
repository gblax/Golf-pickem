import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #006747 0%, #004f36 100%)",
          position: "relative",
        }}
      >
        <svg
          width="120"
          height="140"
          viewBox="0 0 120 140"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M18 10 L18 130"
            stroke="#faf8f2"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M18 18 L90 38 L18 58 Z"
            fill="#c9a449"
            stroke="#a8852a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="130" r="10" fill="#faf8f2" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
