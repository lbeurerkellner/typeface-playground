// SVG path parsing and manipulation utilities

export interface PathCommand {
  type: string;
  values: number[];
}

// Parse SVG path d attribute into command objects
export function parsePath(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  
  // Match command letters followed by numbers
  const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match;
  
  while ((match = regex.exec(d)) !== null) {
    const type = match[1];
    const valueString = match[2].trim();
    
    // Parse numeric values
    const values: number[] = [];
    if (valueString) {
      const numbers = valueString.match(/-?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/g);
      if (numbers) {
        values.push(...numbers.map(Number));
      }
    }
    
    commands.push({ type, values });
  }
  
  return commands;
}

// Serialize path commands back to d attribute string
export function serializePath(commands: PathCommand[]): string {
  return commands
    .map(cmd => {
      if (cmd.values.length === 0) {
        return cmd.type;
      }
      // Round to 2 decimal places for cleaner output
      const roundedValues = cmd.values.map(v => Math.round(v * 100) / 100);
      return `${cmd.type}${roundedValues.join(' ')}`;
    })
    .join('');
}

// Get point on a line segment at parameter t (0-1)
export function getPointOnLine(x1: number, y1: number, x2: number, y2: number, t: number): [number, number] {
  return [
    x1 + (x2 - x1) * t,
    y1 + (y2 - y1) * t,
  ];
}

// Get tangent vector on a line segment
export function getTangentOnLine(x1: number, y1: number, x2: number, y2: number): [number, number] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  return length > 0 ? [dx / length, dy / length] : [1, 0];
}

// Get point on a cubic Bezier curve at parameter t (0-1)
export function getPointOnCubicBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  t: number
): [number, number] {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  return [
    mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3,
    mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3,
  ];
}

// Get tangent on a cubic Bezier curve at parameter t (0-1)
export function getTangentOnCubicBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  t: number
): [number, number] {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  
  const dx = 3 * mt2 * (x1 - x0) + 6 * mt * t * (x2 - x1) + 3 * t2 * (x3 - x2);
  const dy = 3 * mt2 * (y1 - y0) + 6 * mt * t * (y2 - y1) + 3 * t2 * (y3 - y2);
  
  const length = Math.sqrt(dx * dx + dy * dy);
  return length > 0 ? [dx / length, dy / length] : [1, 0];
}

// Get point on a quadratic Bezier curve at parameter t (0-1)
export function getPointOnQuadraticBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  t: number
): [number, number] {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  
  return [
    mt2 * x0 + 2 * mt * t * x1 + t2 * x2,
    mt2 * y0 + 2 * mt * t * y1 + t2 * y2,
  ];
}

// Get tangent on a quadratic Bezier curve at parameter t (0-1)
export function getTangentOnQuadraticBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  t: number
): [number, number] {
  const mt = 1 - t;
  
  const dx = 2 * mt * (x1 - x0) + 2 * t * (x2 - x1);
  const dy = 2 * mt * (y1 - y0) + 2 * t * (y2 - y1);
  
  const length = Math.sqrt(dx * dx + dy * dy);
  return length > 0 ? [dx / length, dy / length] : [1, 0];
}

// Get normal vector (perpendicular to tangent)
export function getNormal(tangentX: number, tangentY: number): [number, number] {
  // Rotate tangent 90 degrees counterclockwise
  return [-tangentY, tangentX];
}

// Subdivide path commands for smoother distortion
// This adds intermediate points to curves
export function subdividePath(commands: PathCommand[], subdivisions: number = 10): PathCommand[] {
  const result: PathCommand[] = [];
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  
  for (const cmd of commands) {
    const type = cmd.type.toUpperCase();
    const values = [...cmd.values];
    
    // Convert relative to absolute for easier processing
    const isRelative = cmd.type === cmd.type.toLowerCase() && cmd.type !== 'z';
    
    if (type === 'M') {
      // Move command - just pass through
      const x = isRelative ? currentX + values[0] : values[0];
      const y = isRelative ? currentY + values[1] : values[1];
      result.push({ type: 'M', values: [x, y] });
      currentX = startX = x;
      currentY = startY = y;
    } else if (type === 'L') {
      // Line - subdivide into multiple line segments
      const x2 = isRelative ? currentX + values[0] : values[0];
      const y2 = isRelative ? currentY + values[1] : values[1];
      
      for (let i = 1; i <= subdivisions; i++) {
        const t = i / subdivisions;
        const [x, y] = getPointOnLine(currentX, currentY, x2, y2, t);
        result.push({ type: 'L', values: [x, y] });
      }
      
      currentX = x2;
      currentY = y2;
    } else if (type === 'C') {
      // Cubic Bezier - subdivide
      const x1 = isRelative ? currentX + values[0] : values[0];
      const y1 = isRelative ? currentY + values[1] : values[1];
      const x2 = isRelative ? currentX + values[2] : values[2];
      const y2 = isRelative ? currentY + values[3] : values[3];
      const x3 = isRelative ? currentX + values[4] : values[4];
      const y3 = isRelative ? currentY + values[5] : values[5];
      
      for (let i = 1; i <= subdivisions; i++) {
        const t = i / subdivisions;
        const [x, y] = getPointOnCubicBezier(currentX, currentY, x1, y1, x2, y2, x3, y3, t);
        if (i === 1) {
          result.push({ type: 'L', values: [x, y] });
        } else {
          result.push({ type: 'L', values: [x, y] });
        }
      }
      
      currentX = x3;
      currentY = y3;
    } else if (type === 'Q') {
      // Quadratic Bezier - subdivide
      const x1 = isRelative ? currentX + values[0] : values[0];
      const y1 = isRelative ? currentY + values[1] : values[1];
      const x2 = isRelative ? currentX + values[2] : values[2];
      const y2 = isRelative ? currentY + values[3] : values[3];
      
      for (let i = 1; i <= subdivisions; i++) {
        const t = i / subdivisions;
        const [x, y] = getPointOnQuadraticBezier(currentX, currentY, x1, y1, x2, y2, t);
        result.push({ type: 'L', values: [x, y] });
      }
      
      currentX = x2;
      currentY = y2;
    } else if (type === 'Z') {
      // Close path
      result.push({ type: 'Z', values: [] });
      currentX = startX;
      currentY = startY;
    } else {
      // Other commands - pass through unchanged
      result.push(cmd);
    }
  }
  
  return result;
}
