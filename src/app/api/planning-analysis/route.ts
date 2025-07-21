"use server";

import { NextResponse } from 'next/server';
import { planningAnalysis } from '@/ai/flows/planning-analysis';

/**
 * @swagger
 * /api/planning-analysis:
 *   post:
 *     summary: Analyze land planning based on a map image
 *     description: Analyzes planning maps to assess the impact of urban planning on land use
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imagePath
 *               - landInfo
 *             properties:
 *               imagePath:
 *                 type: string
 *                 description: Path to the captured planning map image
 *               landInfo:
 *                 type: string
 *                 description: Information about the land plot (plot number, sheet number, area, address, etc.)
 *     responses:
 *       200:
 *         description: Successful planning analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   type: object
 *                   properties:
 *                     currentStatus:
 *                       type: string
 *                       description: Current land status and classification
 *                     newPlanning:
 *                       type: string
 *                       description: New planning designation
 *                     affectedArea:
 *                       type: string
 *                       description: Estimated affected area in m² and percentage
 *                     impactLevel:
 *                       type: string
 *                       description: Impact level (HIGH, MEDIUM, LOW)
 *                     notes:
 *                       type: string
 *                       description: Additional important notes
 *       500:
 *         description: Error performing analysis
 */
export async function POST(request: Request) {
  try {
    const input = await request.json();
    const result = await planningAnalysis(input);
    return NextResponse.json({ 
      success: true, 
      result 
    });
  } catch (error) {
    console.error('Error running planning analysis:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to run analysis' 
    }, { status: 500 });
  }
} 