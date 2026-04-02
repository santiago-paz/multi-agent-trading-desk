'use server';

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function uploadWallpaperAction(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) {
    throw new Error('No file provided');
  }

  // Ensure it's an image
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Generate a unique filename using timestamp
  const timestamp = Date.now();
  const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // sanitize name
  const filename = `${timestamp}_${originalName}`;
  
  // The path to save inside the Next.js public directory
  const uploadsDir = join(process.cwd(), 'public', 'wallpapers', 'uploads');
  
  try {
    await mkdir(uploadsDir, { recursive: true });
  } catch (err: any) {
    if (err.code !== 'EEXIST') throw err;
  }

  const filepath = join(uploadsDir, filename);
  await writeFile(filepath, buffer);

  // Return the public URL and the sanitized original name (without extension)
  const displayName = file.name.split('.').slice(0, -1).join('.') || file.name;
  
  return {
    success: true,
    url: `/wallpapers/uploads/${filename}`,
    name: displayName
  };
}
