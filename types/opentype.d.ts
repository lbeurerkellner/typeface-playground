declare module 'opentype.js' {
  export interface Glyph {
    name: string;
    unicode?: number;
    unicodes: number[];
    index: number;
    advanceWidth: number;
    leftSideBearing: number;
    path: Path;
    getPath(x?: number, y?: number, fontSize?: number, options?: any, font?: Font): Path;
    getBoundingBox(): BoundingBox;
    getPath(x: number, y: number, fontSize: number, options?: any): Path;
  }

  export interface Path {
    commands: PathCommand[];
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    toPathData(decimalPlaces?: number): string;
    toSVG(decimalPlaces?: number): string;
    getBoundingBox(): BoundingBox;
  }

  export interface PathCommand {
    type: string;
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }

  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  export interface Font {
    names: {
      fontFamily: { en: string };
      fontSubfamily: { en: string };
      fullName: { en: string };
      postScriptName: { en: string };
    };
    unitsPerEm: number;
    ascender: number;
    descender: number;
    glyphs: {
      length: number;
      get(index: number): Glyph;
    };
    charToGlyph(char: string): Glyph;
    getPath(
      text: string,
      x: number,
      y: number,
      fontSize: number,
      options?: any
    ): Path;
    getAdvanceWidth(
      text: string,
      fontSize: number,
      options?: any
    ): number;
    draw(
      ctx: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      fontSize: number,
      options?: any
    ): void;
    drawPoints(
      ctx: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      fontSize: number,
      options?: any
    ): void;
    drawMetrics(
      ctx: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      fontSize: number,
      options?: any
    ): void;
  }

  export function load(
    url: string,
    callback: (err: Error | null, font?: Font) => void
  ): void;

  export function loadSync(url: string): Font;

  export function parse(buffer: ArrayBuffer): Font;

  export default {
    load,
    loadSync,
    parse,
  };
}
