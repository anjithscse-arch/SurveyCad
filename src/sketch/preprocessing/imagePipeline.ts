export interface PreprocessingOptions {
  rotation: number; // 0, 90, 180, 270
  brightness: number; // -100 to 100 (default 0)
  contrast: number; // -100 to 100 (default 0)
  grayscale: boolean;
  threshold?: number; // 0 to 255 (optional binarization)
  invert: boolean;
}

export const DEFAULT_PREPROCESSING: PreprocessingOptions = {
  rotation: 0,
  brightness: 0,
  contrast: 15, // slight contrast boost helps field pencil lines
  grayscale: false,
  invert: false,
};

/**
 * Applies client-side non-destructive image filters and transformations on an HTMLImageElement or ImageBitmap.
 */
export async function processImageOnCanvas(
  imageSource: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  options: PreprocessingOptions
): Promise<{ processedCanvas: HTMLCanvasElement; processedDataUrl: string }> {
  const canvas = document.createElement('canvas');

  // Handle rotation
  const isRotated90or270 = options.rotation % 180 !== 0;
  canvas.width = isRotated90or270 ? sourceHeight : sourceWidth;
  canvas.height = isRotated90or270 ? sourceWidth : sourceHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  ctx.save();
  // Center translation for rotation
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((options.rotation * Math.PI) / 180);
  ctx.drawImage(
    imageSource,
    -sourceWidth / 2,
    -sourceHeight / 2,
    sourceWidth,
    sourceHeight
  );
  ctx.restore();

  // Apply pixel manipulation if needed
  if (
    options.grayscale ||
    options.brightness !== 0 ||
    options.contrast !== 0 ||
    options.threshold !== undefined ||
    options.invert
  ) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    // Contrast factor
    const contrastFactor =
      options.contrast !== 0
        ? (259 * (options.contrast + 255)) / (255 * (259 - options.contrast))
        : 1;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // 1. Grayscale
      if (options.grayscale || options.threshold !== undefined) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray;
        g = gray;
        b = gray;
      }

      // 2. Brightness
      if (options.brightness !== 0) {
        r += options.brightness;
        g += options.brightness;
        b += options.brightness;
      }

      // 3. Contrast
      if (options.contrast !== 0) {
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;
      }

      // 4. Thresholding / Binarization
      if (options.threshold !== undefined) {
        const val = r >= options.threshold ? 255 : 0;
        r = val;
        g = val;
        b = val;
      }

      // 5. Invert
      if (options.invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imgData, 0, 0);
  }

  const processedDataUrl = canvas.toDataURL('image/png');
  return { processedCanvas: canvas, processedDataUrl };
}
