import { ImageResponse } from "next/og";

export const contentType = "image/png";

export function generateImageMetadata() {
  return [
    {
      contentType: "image/png",
      size: { width: 192, height: 192 },
      id: "192",
    },
    {
      contentType: "image/png",
      size: { width: 512, height: 512 },
      id: "512",
    },
  ];
}

export default function Icon({ id }: { id: string }) {
  const dim = id === "512" ? 512 : 192;
  const radius = Math.round(dim * 0.18);
  const flagW = Math.round(dim * 0.68);
  const flagH = Math.round(dim * 0.78);

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
          borderRadius: `${radius}px`,
        }}
      >
        <svg
          width={flagW}
          height={flagH}
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
    { width: dim, height: dim }
  );
}
