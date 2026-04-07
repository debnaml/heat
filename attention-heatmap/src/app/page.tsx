'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AttentionAnalysis } from '@/lib/types';
import { exportToPdf } from '@/lib/exportPdf';
import UrlInput from '@/components/UrlInput';
import HeatmapCanvas from '@/components/HeatmapCanvas';
import ScanpathOverlay from '@/components/ScanpathOverlay';
import ScoreCard from '@/components/ScoreCard';
import FindingsList from '@/components/FindingsList';
import AccessGate from '@/components/AccessGate';

type AppState = 'idle' | 'capturing' | 'analysing' | 'complete' | 'error';

const STATUS_MESSAGES: Record<string, string> = {
  idle: '',
  capturing: 'Capturing screenshot…',
  analysing: 'Analysing visual hierarchy…',
  complete: '',
  error: '',
};

export default function Home() {
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AttentionAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.6);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showScanpath, setShowScanpath] = useState(true);
  const [highlightedZone, setHighlightedZone] = useState<string | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const runAnalysis = useCallback(async (base64Screenshot: string) => {
    setAppState('analysing');
    setScreenshot(base64Screenshot);

    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessCode ? { 'x-access-code': accessCode } : {}),
        },
        body: JSON.stringify({ screenshot: base64Screenshot }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data: AttentionAnalysis = await res.json();
      setAnalysis(data);
      setAppState('complete');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(message);
      setAppState('error');
    }
  }, [accessCode]);

  const handleAnalyseUrl = useCallback(
    async (url: string) => {
      setAppState('capturing');
      setErrorMessage('');
      setAnalysis(null);

      try {
        const res = await fetch('/api/screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessCode ? { 'x-access-code': accessCode } : {}),
          },
          body: JSON.stringify({ url }),
          signal: AbortSignal.timeout(60000),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Screenshot capture failed');
        }

        const data = await res.json();
        await runAnalysis(data.screenshot);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setErrorMessage(
          message.includes('reach')
            ? message
            : `Could not capture that URL — is it publicly accessible? (${message})`
        );
        setAppState('error');
      }
    },
    [runAnalysis]
  );

  const handleAnalyseImage = useCallback(
    async (base64: string) => {
      setErrorMessage('');
      setAnalysis(null);
      await runAnalysis(base64);
    },
    [runAnalysis]
  );

  const handleReset = () => {
    setAppState('idle');
    setScreenshot(null);
    setAnalysis(null);
    setErrorMessage('');
    setHighlightedZone(null);
  };

  const isLoading = appState === 'capturing' || appState === 'analysing';

  const handleExportPdf = useCallback(async () => {
    if (!canvasContainerRef.current || !analysis || !screenshot) return;
    setIsExporting(true);
    try {
      await exportToPdf(canvasContainerRef.current, analysis, screenshot);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [analysis, screenshot]);

  // Track canvas dimensions for scanpath overlay
  useEffect(() => {
    if (appState !== 'complete') return;
    const checkCanvas = () => {
      if (canvasContainerRef.current) {
        const canvas = canvasContainerRef.current.querySelector('canvas');
        if (canvas && canvas.width > 0) {
          setCanvasDimensions({ width: canvas.width, height: canvas.height });
        }
      }
    };
    // Small delay for canvas to render
    const timer = setTimeout(checkCanvas, 200);
    window.addEventListener('resize', checkCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkCanvas);
    };
  }, [appState, screenshot]);

  // Show access gate if not authenticated
  if (!accessCode) {
    return <AccessGate onAuthenticated={setAccessCode} />;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500 flex items-center justify-center">
              <span className="text-sm font-bold">H</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Attention Heatmap</h1>
              <p className="text-xs text-zinc-500">Predict where eyes go</p>
            </div>
          </div>
          {appState === 'complete' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Exporting…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export PDF
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer"
              >
                ← New Analysis
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Input section - shown when idle, loading, or error */}
        {(appState === 'idle' || isLoading || appState === 'error') && (
          <div className="flex flex-col items-center">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">
                Analyse any webpage&apos;s visual attention
              </h2>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                Paste a URL or upload a screenshot to see a content-aware heatmap
                predicting where visitors look first.
              </p>
            </div>

            <UrlInput
              onAnalyseUrl={handleAnalyseUrl}
              onAnalyseImage={handleAnalyseImage}
              isLoading={isLoading}
              status={STATUS_MESSAGES[appState]}
            />

            {appState === 'error' && (
              <div className="mt-6 w-full max-w-2xl bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Results section */}
        {appState === 'complete' && screenshot && analysis && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left panel — heatmap + controls */}
            <div className="lg:w-[65%] space-y-4">
              {/* Controls bar */}
              <div className="flex flex-wrap items-center gap-4 bg-zinc-800/60 border border-zinc-700 rounded-lg px-4 py-3">
                {/* Heatmap toggle */}
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                    className="accent-blue-500"
                  />
                  Heatmap
                </label>

                {/* Opacity slider */}
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-xs">Opacity</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={heatmapOpacity}
                    onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                    className="w-24 accent-blue-500"
                    disabled={!showHeatmap}
                  />
                  <span className="text-xs font-mono w-8">
                    {Math.round(heatmapOpacity * 100)}%
                  </span>
                </div>

                {/* Scanpath toggle */}
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showScanpath}
                    onChange={(e) => setShowScanpath(e.target.checked)}
                    className="accent-blue-500"
                  />
                  Scanpath
                </label>
              </div>

              {/* Screenshot + overlays */}
              <div ref={canvasContainerRef} className="relative rounded-lg overflow-hidden">
                <HeatmapCanvas
                  screenshot={screenshot}
                  zones={analysis.zones}
                  opacity={heatmapOpacity}
                  showHeatmap={showHeatmap}
                  highlightedZone={highlightedZone}
                />
                <ScanpathOverlay
                  scanpath={analysis.scanpath}
                  width={canvasDimensions.width}
                  height={canvasDimensions.height}
                  show={showScanpath}
                />
              </div>
            </div>

            {/* Right panel — score + findings */}
            <div className="lg:w-[35%] space-y-6">
              <ScoreCard
                score={analysis.overallScore}
                pageType={analysis.pageType}
                summary={analysis.summary}
              />
              <FindingsList
                findings={analysis.findings}
                onHighlightZone={setHighlightedZone}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}