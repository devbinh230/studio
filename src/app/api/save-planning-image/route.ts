"use server";

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * @swagger
 * /api/save-planning-image:
 *   post:
 *     summary: Save a planning map image to the server
 *     description: Converts a base64 encoded image to a PNG file and saves it in the server's filesystem
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - base64
 *             properties:
 *               base64:
 *                 type: string
 *                 description: Base64 encoded PNG image data
 *     responses:
 *       200:
 *         description: Image saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 path:
 *                   type: string
 *                   description: Path to the saved image file (relative to server root)
 *       500:
 *         description: Error saving image
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const base64 = body.base64.replace(/^data:image\/png;base64,/, '');

    const buffer = Buffer.from(base64, 'base64');

    const imagesDir = path.join(process.cwd(), 'src/ai/images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const filename = `planning_${Date.now()}.png`;
    const filePath = path.join(imagesDir, filename);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ 
      success: true, 
      path: `/ai/images/${filename}` 
    });
  } catch (error) {
    console.error('Error saving image:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save image' 
    }, { status: 500 });
  }
} 