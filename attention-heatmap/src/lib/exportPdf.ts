import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AttentionAnalysis } from './types';

/**
 * Generates a PDF report from the attention heatmap analysis.
 * Captures the heatmap visual from the DOM, then builds a
 * professional multi-page report with score, findings, and zones.
 */
export async function exportToPdf(
  heatmapElement: HTMLElement,
  analysis: AttentionAnalysis,
  screenshotBase64: string
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const dark = '#18181b';
  const white = '#fafafa';
  const gray = '#a1a1aa';
  const blue = '#3b82f6';

  // ═══════════════════════════════════════════
  // Helper functions
  // ═══════════════════════════════════════════

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  }

  function getScoreColor(score: number): string {
    if (score < 30) return '#ef4444';
    if (score < 50) return '#f97316';
    if (score < 70) return '#eab308';
    if (score < 90) return '#22c55e';
    return '#10b981';
  }

  function getScoreLabel(score: number): string {
    if (score < 30) return 'Critical';
    if (score < 50) return 'Poor';
    if (score < 70) return 'Average';
    if (score < 90) return 'Good';
    return 'Exceptional';
  }

  // ═══════════════════════════════════════════
  // PAGE 1 — Title & Score
  // ═══════════════════════════════════════════

  // Header bar
  pdf.setFillColor(24, 24, 27);
  pdf.rect(0, 0, pageWidth, 40, 'F');

  pdf.setTextColor(white);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Attention Heatmap Report', margin, 18);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(gray);
  pdf.text(`Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, 26);
  pdf.text(`Page type: ${analysis.pageType}`, margin, 32);

  y = 50;

  // Score circle
  const scoreColor = getScoreColor(analysis.overallScore);
  const scoreCenterX = pageWidth / 2;
  const scoreCenterY = y + 20;
  const scoreRadius = 18;

  pdf.setDrawColor(scoreColor);
  pdf.setLineWidth(2.5);
  pdf.circle(scoreCenterX, scoreCenterY, scoreRadius);

  pdf.setTextColor(scoreColor);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text(String(analysis.overallScore), scoreCenterX, scoreCenterY + 2, { align: 'center' });

  pdf.setFontSize(9);
  pdf.setTextColor(gray);
  pdf.setFont('helvetica', 'normal');
  pdf.text(getScoreLabel(analysis.overallScore), scoreCenterX, scoreCenterY + scoreRadius + 7, { align: 'center' });

  y = scoreCenterY + scoreRadius + 16;

  // Summary
  pdf.setFontSize(11);
  pdf.setTextColor(dark);
  pdf.setFont('helvetica', 'normal');
  const summaryLines = pdf.splitTextToSize(analysis.summary, contentWidth);
  pdf.text(summaryLines, margin, y);
  y += summaryLines.length * 6 + 10;

  // ═══════════════════════════════════════════
  // Heatmap screenshot capture
  // ═══════════════════════════════════════════

  try {
    const canvas = await html2canvas(heatmapElement, {
      backgroundColor: '#09090b',
      scale: 2,
      useCORS: true,
    });
    const imgData = canvas.toDataURL('image/png');
    const imgAspect = canvas.height / canvas.width;
    const imgWidth = contentWidth;
    const imgHeight = imgWidth * imgAspect;

    checkPageBreak(imgHeight + 10);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(dark);
    pdf.text('Heatmap Overlay', margin, y);
    y += 7;

    pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
    y += imgHeight + 12;
  } catch {
    // If html2canvas fails, just skip the image
    pdf.setFontSize(10);
    pdf.setTextColor(gray);
    pdf.text('[Heatmap image could not be captured]', margin, y);
    y += 10;
  }

  // ═══════════════════════════════════════════
  // PAGE 2+ — Findings
  // ═══════════════════════════════════════════

  checkPageBreak(30);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(dark);
  pdf.text('Design Findings', margin, y);
  y += 10;

  const typeLabels: Record<string, { label: string; color: string }> = {
    strength: { label: 'Strength', color: '#22c55e' },
    weakness: { label: 'Weakness', color: '#ef4444' },
    opportunity: { label: 'Opportunity', color: '#3b82f6' },
  };

  for (const finding of analysis.findings) {
    const config = typeLabels[finding.type] || typeLabels.opportunity;
    const titleLines = pdf.splitTextToSize(`${config.label}: ${finding.title}`, contentWidth - 4);
    const descLines = pdf.splitTextToSize(finding.description, contentWidth - 4);
    const blockHeight = titleLines.length * 5.5 + descLines.length * 5 + 10;

    checkPageBreak(blockHeight);

    // Type badge
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(config.color);
    pdf.text(titleLines, margin + 2, y);
    y += titleLines.length * 5.5 + 2;

    // Description
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#52525b');
    pdf.text(descLines, margin + 2, y);
    y += descLines.length * 5 + 8;

    // Separator
    pdf.setDrawColor('#e4e4e7');
    pdf.setLineWidth(0.2);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 4;
  }

  // ═══════════════════════════════════════════
  // Attention Zones table
  // ═══════════════════════════════════════════

  checkPageBreak(30);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(dark);
  pdf.text('Attention Zones', margin, y);
  y += 8;

  // Table header
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(gray);
  const colX = [margin, margin + 10, margin + 50, margin + 75];
  pdf.text('#', colX[0], y);
  pdf.text('Element', colX[1], y);
  pdf.text('Intensity', colX[2], y);
  pdf.text('Reason', colX[3], y);
  y += 5;

  pdf.setDrawColor('#d4d4d8');
  pdf.setLineWidth(0.3);
  pdf.line(margin, y - 1, pageWidth - margin, y - 1);
  y += 2;

  const sortedZones = [...analysis.zones].sort((a, b) => a.viewOrder - b.viewOrder);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(dark);

  for (const zone of sortedZones) {
    const reasonLines = pdf.splitTextToSize(zone.reason, contentWidth - 75 + margin);
    const rowHeight = Math.max(reasonLines.length * 4.5, 6) + 3;

    checkPageBreak(rowHeight);

    pdf.setFontSize(8);
    pdf.text(String(zone.viewOrder), colX[0], y);
    pdf.text(zone.element.substring(0, 25), colX[1], y);
    pdf.text(`${zone.intensity}/100`, colX[2], y);
    pdf.setFontSize(7);
    pdf.text(reasonLines, colX[3], y);
    y += rowHeight;
  }

  // ═══════════════════════════════════════════
  // Scanpath summary
  // ═══════════════════════════════════════════

  checkPageBreak(30);
  y += 6;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(dark);
  pdf.text('Predicted Scanpath', margin, y);
  y += 8;

  const sortedScanpath = [...analysis.scanpath].sort((a, b) => a.order - b.order);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');

  for (const point of sortedScanpath) {
    checkPageBreak(8);
    pdf.setTextColor(blue);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${point.order}.`, margin, y);
    pdf.setTextColor(dark);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${point.label}  (${point.fixationMs}ms fixation)`, margin + 8, y);
    y += 6;
  }

  // ═══════════════════════════════════════════
  // Footer on each page
  // ═══════════════════════════════════════════

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(gray);
    pdf.text(
      `Attention Heatmap Report — Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Save
  const timestamp = new Date().toISOString().slice(0, 10);
  pdf.save(`attention-heatmap-report-${timestamp}.pdf`);
}
