import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

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
