import type { CaptureRect, Viewport } from "../../shared/types";

export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to decode captured screenshot."));
    image.src = dataUrl;
  });
}

export async function cropSelectedArea(dataUrl: string, area: CaptureRect): Promise<string> {
  const image = await loadImage(dataUrl);
  const viewport: Viewport = area.viewport || {
    width: image.width,
    height: image.height,
    devicePixelRatio: 1
  };
  const scaleX = image.width / Math.max(viewport.width, 1);
  const scaleY = image.height / Math.max(viewport.height, 1);
  const sx = Math.max(0, Math.round(area.rect.x * scaleX));
  const sy = Math.max(0, Math.round(area.rect.y * scaleY));
  const sw = Math.max(1, Math.round(area.rect.width * scaleX));
  const sh = Math.max(1, Math.round(area.rect.height * scaleY));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext("2d");
  if (context) {
    context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  }
  return canvas.toDataURL("image/png");
}

export async function blobUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return await blobToDataUrl(blob);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to prepare attachment download."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

export async function decodeFrame(base64Data: string): Promise<ImageBitmap> {
  const response = await fetch(`data:image/jpeg;base64,${base64Data}`);
  const blob = await response.blob();
  return await createImageBitmap(blob);
}
