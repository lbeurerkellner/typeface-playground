import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const fontPath = pathSegments.join('/');
    const fullPath = path.join(process.cwd(), 'fonts', fontPath);
    
    // Security check: ensure the path is within the fonts directory
    const fontsDir = path.join(process.cwd(), 'fonts');
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(fontsDir)) {
      return NextResponse.json(
        { error: 'Invalid font path' },
        { status: 403 }
      );
    }
    
    // Read the font file
    const fontData = await fs.readFile(fullPath);
    
    // Determine content type
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = ext === '.ttf' ? 'font/ttf' : 'font/otf';
    
    return new NextResponse(fontData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving font:', error);
    return NextResponse.json(
      { error: 'Font not found' },
      { status: 404 }
    );
  }
}
