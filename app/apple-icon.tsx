import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Route segment config
export const runtime = "nodejs";

// Image metadata (Apple Touch Icon recommended size is 180x180 px)
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// Generate the Apple Touch Icon dynamically
export default async function AppleIcon() {
  const imagePath = join(process.cwd(), "public", "favicon.png");
  let imgSrc = "";
  
  try {
    const imageData = await readFile(imagePath);
    const base64Image = Buffer.from(imageData).toString("base64");
    imgSrc = `data:image/png;base64,${base64Image}`;
  } catch (err) {
    console.error("Error reading favicon.png for apple-icon:", err);
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a", // Aksel Tools theme background
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "28px", // Margin to prevent iOS squircle from cutting the icon edges
        }}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt="Aksel Tools"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <div
            style={{
              fontSize: 80,
              fontWeight: "bold",
              color: "#dc2626", // Fallback letter styling
            }}
          >
            A
          </div>
        )}
      </div>
    ),
    {
      ...size,
    }
  );
}
