import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

interface FontFile {
  name: string;
  path: string;
  family: string;
}

async function findFontFiles(dir: string, baseDir: string = dir): Promise<FontFile[]> {
  const fonts: FontFile[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFonts = await findFontFiles(fullPath, baseDir);
        fonts.push(...subFonts);
      } else if (entry.name.match(/\.(ttf|otf)$/i)) {
        const relativePath = path.relative(baseDir, fullPath);
        const family = path.dirname(relativePath).split(path.sep)[0] || 'Unknown';
        
        fonts.push({
          name: entry.name,
          path: relativePath,
          family,
        });
      }
    }
  } catch (error) {
    console.error('Error reading fonts directory:', error);
  }
  
  return fonts;
}

export async function GET() {
  try {
    const fontsDir = path.join(process.cwd(), 'fonts');
    const fonts = await findFontFiles(fontsDir);
    
    return NextResponse.json({ fonts });
  } catch (error) {
    console.error('Error listing fonts:', error);
    return NextResponse.json(
      { error: 'Failed to list fonts' },
      { status: 500 }
    );
  }
}
