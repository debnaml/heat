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
  /** Detected primary content type */
  pageType: string;
}
