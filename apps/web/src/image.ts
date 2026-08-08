/** How wide and tall the stored avatar ends up, in pixels. */
const SIZE = 256;

/** JPEG quality. 0.8 keeps faces sharp at this size while staying small. */
const QUALITY = 0.8;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Turns a photo the user picked into a small square JPEG data URL.
 *
 * Phone photos are several megabytes, which is far too big to store per member.
 * Shrinking happens here in the browser, so the large original is never
 * uploaded at all. The image is centre-cropped to a square first, so portrait
 * and landscape photos both end up as a circle that looks right.
 */
export async function toAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not an image");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That image is too large (max 10 MB)");
  }

  const bitmap = await createImageBitmap(file);

  // Centre-crop: take the largest square that fits inside the original.
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");

  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", QUALITY);
}
