declare module 'gifenc' {
  type RGB = [number, number, number];

  interface GIFEncoderOptions {
    initialCapacity?: number;
    auto?: boolean;
  }

  interface WriteFrameOptions {
    palette?: RGB[];
    delay?: number;
    transparent?: boolean;
    transparentIndex?: number;
    repeat?: number;
    colorDepth?: number;
    dispose?: number;
    first?: boolean;
  }

  interface GIFEncoderInstance {
    reset(): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    buffer: ArrayBuffer;
    writeHeader(): void;
    writeFrame(index: Uint8Array, width: number, height: number, opts?: WriteFrameOptions): void;
  }

  export function GIFEncoder(opts?: GIFEncoderOptions): GIFEncoderInstance;
  export function quantize(data: Uint8Array | Uint8ClampedArray, maxColors: number, options?: { format?: string; oneBitAlpha?: boolean | number }): RGB[];
  export function applyPalette(data: Uint8Array | Uint8ClampedArray, palette: RGB[], format?: string): Uint8Array;
  export function nearestColorIndex(palette: RGB[], pixel: RGB): number;
  export function nearestColor(palette: RGB[], pixel: RGB): RGB;
  export function nearestColorIndexWithDistance(palette: RGB[], pixel: RGB): [number, number];
  export function snapColorsToPalette(palette: RGB[], knownColors: RGB[], threshold?: number): void;
  export function prequantize(data: Uint8Array | Uint8ClampedArray, options?: { roundRGB?: number; roundAlpha?: number; oneBitAlpha?: boolean | number }): void;
}
