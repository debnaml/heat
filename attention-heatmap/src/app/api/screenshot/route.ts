import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';

export const maxDuration = 30; // Vercel function timeout

async function getBrowser() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Serverless environment — use lightweight Chromium
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1440, height: 900 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    // Local dev — use full Puppeteer
    const puppeteer = (await import('puppeteer')).default;
    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
}

export async function POST(req: NextRequest) {
  const authError = validateRequest(req);
  if (authError) return authError;

  const { url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const browser = await getBrowser();

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait a moment for any animations/lazy-loaded content
    await new Promise(resolve => setTimeout(resolve, 2000));

    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'base64',
    });

    await browser.close();

    return NextResponse.json({
      screenshot: screenshot as string,
      width: 1440,
      height: 900,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to capture screenshot: ${message}` },
      { status: 500 }
    );
  }
}
