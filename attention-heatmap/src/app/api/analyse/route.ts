import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ATTENTION_ANALYSIS_PROMPT } from '@/lib/prompts';
import { AttentionAnalysis } from '@/lib/types';
import { validateRequest } from '@/lib/auth';

export const maxDuration = 60; // Vercel function timeout

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const authError = validateRequest(req);
  if (authError) return authError;

  const { screenshot } = await req.json();

  if (!screenshot) {
    return NextResponse.json({ error: 'Screenshot is required' }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: screenshot,
              },
            },
            {
              type: 'text',
              text: ATTENTION_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    });

    // Extract the text response
    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Strip any markdown fencing Claude may have added
    const clean = textBlock.text.replace(/```json\n?|```\n?/g, '').trim();
    const analysis: AttentionAnalysis = JSON.parse(clean);

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error('Analysis error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
