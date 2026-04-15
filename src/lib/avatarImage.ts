// Utilities to reliably shrink avatar uploads to avoid backend upload-size limits.
// No external deps: uses Canvas + WebP for strong compression.

export type PrepareAvatarUploadOptions = {
  /** Longest edge in px */
  maxDimension?: number;
  /** WebP quality (0-1) */
  quality?: number;
};

const defaultOptions: Required<PrepareAvatarUploadOptions> = {
  maxDimension: 512,
  quality: 0.78,
};

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas export failed"));
        resolve(blob);
      },
      type,
      quality
    );
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * Converts/compresses an image to WebP and scales down the longest edge.
 * This keeps avatar uploads small and avoids 413 (Payload too large).
 */
export async function prepareAvatarUpload(
  file: File,
  options: PrepareAvatarUploadOptions = {}
): Promise<File> {
  const { maxDimension, quality } = { ...defaultOptions, ...options };

  if (!file.type.startsWith("image/")) {
    throw new Error("Invalid file type");
  }

  // Already tiny? still normalize to webp, but avoid wasting time on extremely small files.
  // (We still normalize most images to avoid edge cases with very large pixel dimensions.)
  const img = await loadImageFromFile(file);

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const longest = Math.max(srcW, srcH);
  const scale = longest > maxDimension ? maxDimension / longest : 1;

  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, dstW, dstH);

  const blob = await canvasToBlob(canvas, "image/webp", quality);

  // keep a stable filename; extension matches content-type
  const baseName = (file.name || "avatar").replace(/\.[^/.]+$/, "");
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}
