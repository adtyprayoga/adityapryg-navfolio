export type CoverMotif = 'document' | 'pages' | 'contour' | 'diagram';
export type CoverPalette = 'terracotta' | 'gold' | 'navy' | 'sage' | 'plum' | 'teal';

const designs: Record<string, { motif: CoverMotif; palette: CoverPalette }> = {
  'weekly-journal-bot': { motif: 'document', palette: 'terracotta' },
  'bm-payroll': { motif: 'document', palette: 'gold' },
  'silog-polri': { motif: 'diagram', palette: 'navy' },
  'lms-bpk-ri': { motif: 'pages', palette: 'sage' },
  'bnsp-information-system': { motif: 'document', palette: 'teal' },
  'siap-kerja-audit': { motif: 'document', palette: 'plum' },
  smartland: { motif: 'contour', palette: 'sage' },
  'sidanau-brin': { motif: 'contour', palette: 'navy' },
  sislap: { motif: 'document', palette: 'terracotta' },
  amdalnet: { motif: 'contour', palette: 'teal' },
  'bos-v2': { motif: 'diagram', palette: 'gold' },
  'pijar-bmkg': { motif: 'contour', palette: 'plum' },
  'siks-ng': { motif: 'diagram', palette: 'sage' },
  'sipp-2': { motif: 'diagram', palette: 'navy' },
  'ekiat-guru': { motif: 'pages', palette: 'gold' },
  'pjb-ims2': { motif: 'diagram', palette: 'teal' },
  'navfolio-site': { motif: 'pages', palette: 'plum' },
  bukubook: { motif: 'pages', palette: 'terracotta' },
};

export function coverDesign(id: string) {
  return designs[id] ?? { motif: 'diagram' as const, palette: 'navy' as const };
}
