# Attention Heatmap POC — Build Guide

> **What this is:** A step-by-step guide for Claude Code agents to build a proof-of-concept tool that captures a screenshot of any website and generates a content-aware attention heatmap predicting where users' eyes will go.

---

## Project Overview

### What We're Building

A Next.js web app where the user pastes a URL or uploads a screenshot. The tool then:

1. Captures a full-viewport screenshot of the target page (if URL provided)
2. Sends the screenshot to Claude's vision API with a detailed analytical prompt
3. Receives structured attention data (coordinates, scores, scanpath)
4. Renders an interactive heatmap overlay on top of the screenshot
5. Shows a design effectiveness score with specific findings

### What We're NOT Building (Yet)

- No database / no saved results
- No user accounts
- No history
- No PDF export
- Just a single-page tool that analyses and displays results in-session

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Screenshot capture | Puppeteer (via API route) |
| AI analysis | Anthropic Claude API (claude-sonnet-4-20250514, vision) |
| Heatmap rendering | HTML5 Canvas (overlaid on screenshot) |
| Deployment | Local dev only for POC |

---

## Prerequisites — What You Need Before Starting

1. **Node.js 18+** installed
2. **An Anthropic API key** — get one from https://console.anthropic.com
3. **Create a `.env.local` file** in the project root with:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

---

## Step-by-Step Build Plan

### Step 1: Scaffold the Project

```bash
npx create-next-app@latest attention-heatmap --typescript --tailwind --app --src-dir --no-eslint
cd attention-heatmap
```

Install dependencies:

```bash
npm install puppeteer @anthropic-ai/sdk
```

### Step 2: Create the Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main UI — input form + results display
│   ├── globals.css         # Tailwind base styles
│   └── api/
│       ├── screenshot/
│       │   └── route.ts    # API: captures screenshot via Puppeteer
│       └── analyse/
│           └── route.ts    # API: sends screenshot to Claude vision, returns attention data
├── components/
│   ├── UrlInput.tsx        # URL input + upload form component
│   ├── HeatmapCanvas.tsx   # Canvas overlay rendering the heatmap on the screenshot
│   ├── ScanpathOverlay.tsx # SVG overlay showing predicted eye movement arrows
│   ├── ScoreCard.tsx       # Overall design effectiveness score display
│   └── FindingsList.tsx    # List of specific findings/recommendations
├── lib/
│   ├── prompts.ts          # The Claude vision analysis prompt
│   └── types.ts            # TypeScript interfaces for the attention data
```

### Step 3: Define the Types (`src/lib/types.ts`)

This is the data contract between the Claude API response and the frontend rendering.

```typescript
export interface AttentionZone {
  id: string;
  /** Coordinates as percentages of image dimensions (0-100) */
  x: number;
  y: number;
  /** Width and height of the zone as percentages */
  width: number;
  height: number;
  /** Attention intensity: 0-100 */
  intensity: number;
  /** What the element is */
  element: string;
  /** Why it attracts attention */
  reason: string;
  /** Priority order: 1 = first thing seen, 2 = second, etc. */
  viewOrder: number;
}

export interface ScanpathPoint {
  /** Coordinates as percentages */
  x: number;
  y: number;
  /** Sequential order */
  order: number;
  /** Estimated fixation duration in ms */
  fixationMs: number;
  /** What the eye lands on */
  label: string;
}

export interface DesignFinding {
  type: 'strength' | 'weakness' | 'opportunity';
  title: string;
  description: string;
  /** Which zone ID this relates to, if any */
  zoneId?: string;
}

export interface AttentionAnalysis {
  /** Overall design effectiveness score 0-100 */
  overallScore: number;
  /** One-line summary of the page's attention performance */
  summary: string;
  /** All detected attention zones */
  zones: AttentionZone[];
  /** Predicted eye movement scanpath */
  scanpath: ScanpathPoint[];
  /** Specific design findings */
  findings: DesignFinding[];
  /** Detected primary content type: landing-page, article, e-commerce, dashboard, etc. */
  pageType: string;
}
```

### Step 4: Build the Claude Vision Prompt (`src/lib/prompts.ts`)

This is the most important file — it's what makes the analysis content-aware rather than just pattern-based.

```typescript
export const ATTENTION_ANALYSIS_PROMPT = `You are an expert UX researcher and visual attention analyst. You combine deep knowledge of eye-tracking research, visual saliency science, cognitive psychology, and web design principles.

Analyse this website screenshot and predict where a first-time visitor's eyes will go, in what order, and why. Your analysis must be CONTENT-AWARE — don't just apply generic patterns. Actually read and evaluate the content.

## Analysis Framework

For each element on the page, evaluate its attention weight using ALL of these factors:

### Visual Saliency Factors
- **Size dominance**: Larger elements relative to surroundings attract more attention
- **Colour contrast**: Elements that contrast sharply with their background (compute relative contrast)
- **Colour isolation**: A single element in a unique colour dominates (e.g., one red button on a grey page)
- **Whitespace isolation**: Elements surrounded by generous whitespace draw the eye
- **Image content**: Photos of human faces (especially eyes looking at camera) are the strongest attention magnets. Hands pointing, product images, and video play buttons are also strong.
- **Motion indicators**: Elements suggesting movement (carousels, video thumbnails, animated indicators)

### Content & Semantic Factors
- **Headline power**: Score the headline text itself. Specific, benefit-driven, emotionally resonant headlines pull harder than generic ones. "Save 50% on your energy bill" beats "Welcome to our website".
- **CTA clarity**: Buttons with action-oriented, specific text ("Start free trial") pull more than vague ones ("Learn more"). High-contrast buttons in isolation pull hardest.
- **Information scent**: Content that promises to answer the visitor's likely question gets more attention
- **Numbers and data**: Specific numbers, statistics, and prices attract fixation
- **Social proof**: Testimonials, star ratings, trust badges, client logos — these are attention anchors

### Cognitive & Reading Factors
- **Reading entry point**: Where does the eye naturally enter? Usually top-left for LTR, but a dominant visual element can override this
- **Visual hierarchy**: Does the page establish a clear hierarchy? H1 > H2 > body creates a natural scanpath. Flat hierarchy causes scattered attention.
- **Gestalt grouping**: How do elements cluster? The eye treats visual groups as units
- **Banner blindness**: Standard ad-sized rectangles, especially at top or right sidebar, get IGNORED even if they contain important content
- **F-pattern vs Z-pattern**: Text-heavy pages follow F-pattern. Visual/marketing pages follow Z-pattern. But these are DEFAULTS — strong visual elements override them.

## Output Format

Respond with ONLY a JSON object (no markdown, no backticks, no preamble) matching this exact structure:

{
  "overallScore": <number 0-100>,
  "summary": "<one sentence>",
  "pageType": "<landing-page|article|e-commerce|dashboard|portfolio|corporate|blog|other>",
  "zones": [
    {
      "id": "zone-1",
      "x": <number 0-100, percentage from left>,
      "y": <number 0-100, percentage from top>,
      "width": <number 0-100, percentage of image width>,
      "height": <number 0-100, percentage of image height>,
      "intensity": <number 0-100>,
      "element": "<what it is>",
      "reason": "<why it attracts attention, referencing specific content>",
      "viewOrder": <number, 1 = seen first>
    }
  ],
  "scanpath": [
    {
      "x": <centre of fixation, percentage>,
      "y": <centre of fixation, percentage>,
      "order": <sequential number>,
      "fixationMs": <estimated milliseconds>,
      "label": "<what the eye lands on>"
    }
  ],
  "findings": [
    {
      "type": "<strength|weakness|opportunity>",
      "title": "<short title>",
      "description": "<specific, actionable description referencing actual content on the page>",
      "zoneId": "<optional zone-id>"
    }
  ]
}

## Scoring Guide

- **90-100**: Exceptional. Clear hierarchy, compelling content in the right places, strong visual flow.
- **70-89**: Good. Solid hierarchy with minor issues. Most visitors will find key content quickly.
- **50-69**: Average. Some hierarchy but competing elements, unclear primary CTA, or weak content placement.
- **30-49**: Poor. Confusing layout, buried key content, visual clutter, or no clear scanpath.
- **0-29**: Critical issues. Major usability problems, no discernible hierarchy.

## Rules
- Identify 5-15 attention zones depending on page complexity
- Scanpath should have 5-10 points showing the predicted eye journey
- Include at least 3 findings (mix of strengths, weaknesses, opportunities)
- All coordinates are PERCENTAGES of the image dimensions
- Be specific about content — quote or reference actual text/images you can see
- Consider the likely intent of a visitor to this type of page`;
```

### Step 5: Build the Screenshot API Route (`src/app/api/screenshot/route.ts`)

```typescript
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
      screenshot: screenshot,
      width: 1440,
      height: 900,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to capture screenshot: ${error.message}` },
      { status: 500 }
    );
  }
}
```

### Step 6: Build the Analysis API Route (`src/app/api/analyse/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ATTENTION_ANALYSIS_PROMPT } from '@/lib/prompts';
import { AttentionAnalysis } from '@/lib/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
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

    // Parse the JSON response
    const analysis: AttentionAnalysis = JSON.parse(textBlock.text);

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: `Analysis failed: ${error.message}` },
      { status: 500 }
    );
  }
}
```

### Step 7: Build the Heatmap Canvas Component (`src/components/HeatmapCanvas.tsx`)

This is the core visual component. It overlays a heatmap on the screenshot using HTML5 Canvas.

**Implementation requirements:**

- Accept the base64 screenshot and the `AttentionZone[]` array as props
- Draw the screenshot as the base layer on a canvas
- For each attention zone, draw a radial gradient circle:
  - Centre at `(zone.x%, zone.y%)` of the canvas dimensions
  - Radius proportional to `zone.width` and `zone.height`
  - Colour mapped from intensity: 0 = transparent, 30 = blue, 50 = green, 70 = yellow, 90 = red
  - Use `globalCompositeOperation = 'screen'` for the heatmap layer so colours blend nicely
- The heatmap layer should have adjustable opacity (slider control, default ~0.6)
- Canvas should be responsive and maintain aspect ratio
- Add hover interaction: when the mouse is over a zone, show a tooltip with the zone's `element` and `reason`

**Colour gradient for heatmap (low to high intensity):**
```
0-20:   rgba(0, 0, 255, 0.1)    // Cool blue, barely visible
20-40:  rgba(0, 255, 255, 0.3)  // Cyan  
40-60:  rgba(0, 255, 0, 0.5)    // Green
60-80:  rgba(255, 255, 0, 0.7)  // Yellow
80-100: rgba(255, 0, 0, 0.9)    // Hot red
```

### Step 8: Build the Scanpath Overlay (`src/components/ScanpathOverlay.tsx`)

An SVG overlay (absolutely positioned on top of the canvas) that shows the predicted eye movement path.

**Implementation requirements:**

- SVG element sized to match the canvas exactly
- For each scanpath point, draw:
  - A numbered circle at `(point.x%, point.y%)` — number = the order
  - Circle size proportional to `fixationMs` (longer fixation = larger circle)
  - Semi-transparent white fill with a coloured border
- Between consecutive points, draw an arrow (line with arrowhead) showing the direction of eye movement
- Arrows should be curved slightly (use SVG quadratic bezier `Q` paths) to look more natural than straight lines
- Arrow colour: gradient from cool (first) to warm (last) to show the time progression
- Add a toggle to show/hide the scanpath independently of the heatmap

### Step 9: Build the Score Card Component (`src/components/ScoreCard.tsx`)

Displays the overall design effectiveness score prominently.

**Implementation requirements:**

- Large circular score gauge (think speedometer style)
- Colour coded: red (0-29), orange (30-49), yellow (50-69), green (70-89), bright green (90-100)
- Show the `pageType` as a label
- Show the `summary` text below the score
- Animate the score counting up on load

### Step 10: Build the Findings List Component (`src/components/FindingsList.tsx`)

Shows the specific design findings in a clear, categorised list.

**Implementation requirements:**

- Group by type: strengths, weaknesses, opportunities
- Each type has a distinct colour/icon (green check, red warning, blue lightbulb)
- Each finding shows title + description
- If a finding has a `zoneId`, clicking it should highlight that zone on the heatmap (emit an event or use shared state)
- Collapsible sections

### Step 11: Build the Main Page (`src/app/page.tsx`)

The single-page app tying everything together.

**Implementation requirements:**

- **Input section** (top of page):
  - URL text input with "Analyse" button
  - OR a file upload dropzone for screenshots (accept PNG, JPG, WEBP)
  - Clear visual separation between the two input methods
  - Loading state: show a progress indicator with status messages ("Capturing screenshot...", "Analysing visual hierarchy...", "Generating heatmap...")

- **Results section** (shown after analysis completes):
  - Left panel (roughly 65% width): The screenshot with heatmap + scanpath overlay
    - Controls bar above: opacity slider, heatmap toggle, scanpath toggle
  - Right panel (roughly 35% width): Score card at top, findings list below
  - The layout should be responsive — stack vertically on narrow screens

- **State management:**
  - Use React `useState` for all state (no external state library needed for POC)
  - States: `idle` → `capturing` → `analysing` → `complete` (or `error`)

- **Flow when user enters a URL and clicks Analyse:**
  1. Set state to `capturing`
  2. POST to `/api/screenshot` with the URL
  3. Receive base64 screenshot
  4. Set state to `analysing`
  5. POST to `/api/analyse` with the screenshot
  6. Receive the `AttentionAnalysis` JSON
  7. Set state to `complete`, render all result components

- **Flow when user uploads a screenshot:**
  1. Read the file as base64 (FileReader API)
  2. Skip the screenshot step, go straight to `analysing`
  3. POST to `/api/analyse`
  4. Same result rendering

### Step 12: Styling & Polish

- Use a dark theme — dark backgrounds make the heatmap colours pop
- Minimal, professional aesthetic — this is a tool, not a marketing page
- Monospace font for scores/data, clean sans-serif for text
- Smooth transitions between states
- Error states should be clear and helpful (e.g., "Could not reach that URL — is it publicly accessible?")

---

## Running the POC

```bash
npm run dev
```

Then open `http://localhost:3000`, paste a URL, and hit Analyse.

---

## Key Technical Notes for the Build Agent

1. **Puppeteer on macOS** may need additional setup. If it fails to launch, try adding `executablePath` pointing to a local Chrome installation.

2. **The Claude API response parsing** — the prompt asks for raw JSON with no markdown fencing. However, Claude sometimes wraps it in backticks anyway. The `/api/analyse` route should strip ```json and ``` wrappers before parsing, as a safety measure:
   ```typescript
   const clean = textBlock.text.replace(/```json\n?|```\n?/g, '').trim();
   const analysis = JSON.parse(clean);
   ```

3. **Canvas rendering performance** — for the heatmap, pre-render the gradient circles to an offscreen canvas, then composite onto the main canvas. This avoids redrawing on every opacity change.

4. **Image CORS** — since the screenshot is generated server-side as base64, there are no CORS issues with drawing it to canvas.

5. **API route timeout** — Puppeteer + Claude analysis can take 15-30 seconds total. The Next.js dev server has no timeout by default, but add a timeout to the fetch calls on the frontend (e.g., 60 seconds) with appropriate loading states.

6. **Coordinate system** — ALL coordinates from Claude are percentages (0-100). Convert to pixel coordinates on the frontend using the actual rendered canvas dimensions. This makes the system resolution-independent.

---

## Testing Checklist

After the build, test with these URLs to verify different page types are handled well:

- A landing page with a hero image and CTA (e.g., a SaaS homepage)
- A news article with lots of text (e.g., BBC News)
- An e-commerce product page (e.g., a product on a major retailer)
- A minimal portfolio site
- Upload a screenshot manually to test the upload flow

For each, verify:
- [ ] Heatmap zones appear in sensible locations
- [ ] Scanpath arrows show a logical reading order
- [ ] Score seems reasonable for the design quality
- [ ] Findings reference actual content on the page (not generic advice)
- [ ] Opacity slider works smoothly
- [ ] Toggles for heatmap/scanpath work independently
- [ ] Hover tooltips appear on zones

---

## Future Enhancements (Post-POC)

These are NOT in scope for this build but are the natural next steps:

- Save results to Supabase with shareable URLs
- PDF report export for client deliverables
- Comparison mode (analyse two URLs side by side)
- Mobile viewport analysis (320px, 375px, 768px viewports)
- Batch analysis (multiple pages from a sitemap)
- Historical tracking (re-analyse monthly, track score changes)
- Integration with Lighthouse/PageSpeed for combined UX scoring
