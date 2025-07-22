'use server';

import swaggerJSDoc from 'swagger-jsdoc';
import { NextResponse } from 'next/server';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Studio API',
      version: '1.0.0',
      description: 'API documentation for Studio Next.js backend',
    },
  },
  apis: ['./src/app/api/**/route.ts'], // Scan all route files
};

export async function GET() {
  const spec = swaggerJSDoc(options);
  return NextResponse.json(spec);
} 