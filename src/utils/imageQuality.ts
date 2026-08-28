/**
 * Image Quality Pre-Validation Utility for KrishiRakshak AI
 * Evaluates uploaded leaf images for blurriness, exposure anomalies, and leaf presence.
 */

export interface QualityMetrics {
  sharpness: number;      // Higher is sharper, < 15 is blurry
  brightness: number;     // 0-255 scale, < 18 is too dark, > 238 is overexposed
  leafCoverage: number;   // Percentage (0-100) of pixels matching plant/leaf hues
}

export interface QualityCheckResult {
  valid: boolean;
  score: number; // 0 to 1
  status: 'OK' | 'BLURRY' | 'EXPOSURE_DARK' | 'EXPOSURE_BRIGHT' | 'NON_LEAF';
  messageKey: string;
  metrics: QualityMetrics;
}

/**
 * Calculates HSL from RGB values
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s, l];
}

/**
 * Analyzes image quality parameters before running ML inference.
 */
export function checkImageQuality(imageData: ImageData): QualityCheckResult {
  const { data, width, height } = imageData;
  const totalPixels = width * height;

  let totalLuminance = 0;
  let leafPixels = 0;
  let edgeSum = 0;

  // Grayscale buffer for sharpness (Laplacian-like edge variance)
  const gray = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    // Luminance formula
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = lum;
    totalLuminance += lum;

    // HSL conversion for plant tissue detection
    const [h, s, l] = rgbToHsl(r, g, b);

    // Skip near-black background
    if (l < 0.05) continue;

    // Plant Leaf Hue Coverage:
    // Green (80-165°), Yellow/Gold (35-80°), Orange-Brown Rust (10-35°), Dark Lesions (L < 0.35 & S > 0.1)
    const isGreen = h >= 75 && h <= 165 && s > 0.15;
    const isYellow = h >= 35 && h < 75 && s > 0.20 && l > 0.25;
    const isBrownOrRust = (h >= 10 && h < 35 || h >= 330) && s > 0.15 && l > 0.15 && l < 0.70;
    const isNecroticSpot = l >= 0.05 && l < 0.35 && s > 0.10;

    if (isGreen || isYellow || isBrownOrRust || isNecroticSpot) {
      leafPixels++;
    }
  }

  // Calculate sharpness via 2D horizontal/vertical gradient variance
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = y * width + x;
      const dx = Math.abs(gray[idx] - gray[idx + 1]);
      const dy = Math.abs(gray[idx] - gray[idx + width]);
      edgeSum += dx + dy;
    }
  }

  const avgBrightness = totalLuminance / totalPixels;
  const sharpness = (edgeSum / (totalPixels / 4)) * 2.5; // Normalized scale
  const leafCoverage = (leafPixels / totalPixels) * 100;

  const metrics: QualityMetrics = {
    sharpness: Math.round(sharpness * 10) / 10,
    brightness: Math.round(avgBrightness),
    leafCoverage: Math.round(leafCoverage * 10) / 10
  };

  // Pre-check Threshold Rules:
  // 1. Exposure too dark
  if (avgBrightness < 18) {
    return {
      valid: false,
      score: 0.20,
      status: 'EXPOSURE_DARK',
      messageKey: 'errImageDark',
      metrics
    };
  }

  // 2. Exposure overexposed/too bright
  if (avgBrightness > 238) {
    return {
      valid: false,
      score: 0.25,
      status: 'EXPOSURE_BRIGHT',
      messageKey: 'errImageOverexposed',
      metrics
    };
  }

  // 3. Image excessively blurry
  if (sharpness < 12.0) {
    return {
      valid: false,
      score: 0.30,
      status: 'BLURRY',
      messageKey: 'errImageBlurry',
      metrics
    };
  }

  // 4. Non-leaf or insufficient plant tissue (< 12% leaf coverage)
  if (leafCoverage < 12.0) {
    return {
      valid: false,
      score: 0.15,
      status: 'NON_LEAF',
      messageKey: 'errNonLeaf',
      metrics
    };
  }

  const qualityScore = Math.min(1.0, 0.5 + (sharpness / 100) + (leafCoverage / 200));

  return {
    valid: true,
    score: Math.round(qualityScore * 100) / 100,
    status: 'OK',
    messageKey: 'qualityOk',
    metrics
  };
}
