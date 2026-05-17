 
/**
 * MarkerDetector.js
 * Pure-JS detection logic for Marker 1:
 *   - 140×140 outer square (thick black border ~15px)
 *   - Small 20×20 black square in top-left corner of the inner area
 *
 * Works on a greyscale pixel array (Uint8Array) from a downscaled frame.
 * Returns null if no marker found, or a detection object with corners + orientation.
 */

// ─── Thresholding ────────────────────────────────────────────────────────────

/**
 * Convert RGBA pixel array to greyscale + binary (0 or 255).
 * threshold: 0–255, pixels below this become 0 (black), above become 255 (white)
 */
// MarkerDetector.js
export function rgbaToGrayscaleBinary(rgbaData, width, height, threshold = 128) {
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = rgbaData[i * 4];
    const g = rgbaData[i * 4 + 1];
    const b = rgbaData[i * 4 + 2];
    const grey = 0.299 * r + 0.587 * g + 0.114 * b;
    binary[i] = grey < threshold ? 0 : 255;
  }
  return binary;
}

// ─── Connected components (simple flood-fill blob finder) ─────────────────────

function floodFill(binary, width, height, startX, startY, visited, targetVal) {
  const stack = [[startX, startY]];
  const pixels = [];
  let minX = startX, maxX = startX, minY = startY, maxY = startY;

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const idx = y * width + x;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx] || binary[idx] !== targetVal) continue;
    visited[idx] = 1;
    pixels.push([x, y]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return { pixels, minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Find all black (0) blobs in the binary image.
 * Returns array of blobs with bounding box info.
 */
export function findBlobs(binary, imgWidth, imgHeight, minSize = 100) {
  const visited = new Uint8Array(imgWidth * imgHeight);
  const blobs = [];

  for (let y = 0; y < imgHeight; y++) {
    for (let x = 0; x < imgWidth; x++) {
      const idx = y * imgWidth + x;
      if (!visited[idx] && binary[idx] === 0) {
        const blob = floodFill(binary, imgWidth, imgHeight, x, y, visited, 0);
        if (blob.pixels.length >= minSize) {
          blobs.push(blob);
        }
      }
    }
  }

  return blobs;
}

// ─── Squareness test ─────────────────────────────────────────────────────────

/**
 * Returns true if a blob's bounding box is roughly square.
 * aspectRatio tolerance: 0.75–1.25
 */
export function isSquarish(blob) {
  const ratio = blob.width / blob.height;
  return ratio >= 0.7 && ratio <= 1.3 && blob.width > 30 && blob.height > 30;
}

// ─── Hollow frame test ────────────────────────────────────────────────────────

/**
 * Checks if a blob looks like a hollow square frame (not a solid square).
 * It samples the centre region — if it's mostly white, it's a frame.
 */
export function isHollowFrame(binary, imgWidth, blob) {
  const cx = Math.round((blob.minX + blob.maxX) / 2);
  const cy = Math.round((blob.minY + blob.maxY) / 2);
  const sampleRadius = Math.round(Math.min(blob.width, blob.height) * 0.25);
  let whiteCount = 0;
  let total = 0;

  for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
    for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px < 0 || px >= imgWidth || py < 0) continue;
      const val = binary[py * imgWidth + px];
      if (val === 255) whiteCount++;
      total++;
    }
  }

  const whiteFraction = whiteCount / total;
  return whiteFraction > 0.55; // centre is mostly white → hollow
}

// ─── Corner square test (Marker 1 specific) ──────────────────────────────────

/**
 * Checks for the 20×20 black square in the top-left interior of the frame.
 * Returns the corner index (0=TL, 1=TR, 2=BR, 3=BL) where the small square is found,
 * or -1 if not found.
 * This also tells us the orientation of the marker.
 */
export function findCornerSquare(binary, imgWidth, blob) {
  const innerOffsetRatio = 0.08; // small square is ~8% inset from corner
  const smallSizeRatio = 0.15;   // small square is ~15% of marker size

  const bw = blob.width;
  const bh = blob.height;
  const smallW = Math.round(bw * smallSizeRatio);
  const smallH = Math.round(bh * smallSizeRatio);
  const offset = Math.round(bw * innerOffsetRatio);

  // Four corners to check: TL, TR, BR, BL
  const corners = [
    { x: blob.minX + offset, y: blob.minY + offset, name: 'TL' },           // top-left
    { x: blob.maxX - offset - smallW, y: blob.minY + offset, name: 'TR' },  // top-right
    { x: blob.maxX - offset - smallW, y: blob.maxY - offset - smallH, name: 'BR' }, // bottom-right
    { x: blob.minX + offset, y: blob.maxY - offset - smallH, name: 'BL' },  // bottom-left
  ];

  for (let ci = 0; ci < corners.length; ci++) {
    const { x, y } = corners[ci];
    let blackCount = 0;
    let total = 0;

    for (let dy = 0; dy < smallH; dy++) {
      for (let dx = 0; dx < smallW; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || px >= imgWidth || py < 0) continue;
        const val = binary[py * imgWidth + px];
        if (val === 0) blackCount++;
        total++;
      }
    }

    const blackFraction = blackCount / total;
    if (blackFraction > 0.55) {
      return ci; // found the small black square at this corner
    }
  }

  return -1;
}

// ─── Main detection function ──────────────────────────────────────────────────

/**
 * detectMarker(rgbaData, width, height)
 * 
 * rgbaData: Uint8Array of RGBA pixels from the camera frame
 * width, height: dimensions of the (downscaled) frame
 * 
 * Returns: { found: true, bbox, cornerIndex, rotation } or { found: false }
 * 
 * cornerIndex → rotation needed to fix orientation:
 *   0 (TL) → 0°  (already correct)
 *   1 (TR) → 90° counter-clockwise
 *   2 (BR) → 180°
 *   3 (BL) → 90° clockwise (270° CCW)
 */
export function detectMarker(rgbaData, width, height) {
  // Step 1: Convert to binary
  const binary = rgbaToGrayscaleBinary(rgbaData, width, height, 100);

  // Step 2: Find black blobs
  const blobs = findBlobs(binary, width, height, 200);

  // Step 3: Filter for square-ish hollow frames
  const candidates = blobs.filter(b => isSquarish(b) && isHollowFrame(binary, width, b));

  if (candidates.length === 0) return { found: false };

  // Step 4: Sort by area descending, try the biggest first
  candidates.sort((a, b) => b.pixels.length - a.pixels.length);

  for (const blob of candidates) {
    // Step 5: Check for corner square (Marker 1's unique feature)
    const cornerIndex = findCornerSquare(binary, width, blob);
    if (cornerIndex === -1) continue;

    // Rotation correction needed
    const rotationMap = [0, 270, 180, 90]; // degrees to rotate to normalise
    const rotation = rotationMap[cornerIndex];

    return {
      found: true,
      bbox: {
        x: blob.minX,
        y: blob.minY,
        width: blob.width,
        height: blob.height,
      },
      cornerIndex,
      rotation,
      confidence: blob.pixels.length,
    };
  }

  return { found: false };
}

// ─── Scale bbox back to original frame coordinates ────────────────────────────

/**
 * When you downscale the frame before detection, scale the bbox back up
 * before cropping the full-res image.
 */
export function scaleBbox(bbox, scaleX, scaleY) {
  return {
    x: Math.round(bbox.x * scaleX),
    y: Math.round(bbox.y * scaleY),
    width: Math.round(bbox.width * scaleX),
    height: Math.round(bbox.height * scaleY),
  };
}
