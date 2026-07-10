// Generate a native, fully-editable PowerPoint of the 4-slide Aura demo deck.
// Real text boxes + shapes (not screenshots) so the team can rebrand/edit.
// Run: npm run deck:aura:pptx   →   WealthPulse-Aura-Deck.pptx
import PptxGenJS from 'pptxgenjs';

const OUT = '/Users/nasghar/gold/wealthapp/WealthPulse-Aura-Deck.pptx';

// Palette (matches the app / HTML deck)
const C = {
  bg: '070B16', panel: '121A2E', panelSoft: '0E1424',
  border: '2A3350', text: 'E9EEF7', dim: 'C3CCDC', muted: '8B95AB',
  gold: 'D8B25A', gold2: 'E7CD88', pos: '2FD180', neg: 'FF5C6C', accent: '6EA8FE',
};
const FONT = 'Arial';

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'W', width: 13.333, height: 7.5 });
pptx.layout = 'W';
pptx.author = 'SingleStore';
pptx.company = 'SingleStore';
pptx.title = 'WealthPulse × Aura — Demo Deck';

const MX = 0.72; // left margin

function slide() {
  const s = pptx.addSlide();
  s.background = { color: C.bg };
  return s;
}
function eyebrow(s, t) {
  s.addText(t.toUpperCase(), { x: MX, y: 0.55, w: 12, h: 0.4, fontFace: FONT, fontSize: 12.5,
    bold: true, color: C.gold, charSpacing: 3 });
}
function title(s, runs, y = 1.15, size = 44) {
  s.addText(runs, { x: MX, y, w: 12, h: 1.5, fontFace: FONT, fontSize: size, bold: true, lineSpacing: size * 1.02 });
}
function box(s, x, y, w, h, opts = {}) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12,
    fill: { color: opts.fill || C.panel }, line: { color: opts.line || C.border, width: 1 } });
}
// bullet-style list block
function ticks(s, items, x, y, w, color = C.dim) {
  s.addText(items.map((t) => ({ text: t, options: { bullet: { code: '2022', indent: 16 }, color, breakLine: true } })),
    { x, y, w, h: 2.4, fontFace: FONT, fontSize: 14.5, color, lineSpacingMultiple: 1.25, valign: 'top' });
}

/* ---------- Slide 1 · Thesis ---------- */
{
  const s = slide();
  eyebrow(s, 'Aura Intelligence Platform');
  title(s, [
    { text: 'Intelligence is the ', options: { color: C.text } },
    { text: 'new moat.', options: { color: C.gold } },
  ], 1.7, 54);
  s.addText([
    { text: "The agentic era won't be won by the biggest model — everyone rents the same ones. It's won by whoever turns ", options: { color: C.dim } },
    { text: 'live context into action', options: { color: C.text, bold: true } },
    { text: ' first. That speed is the moat, and moats compound.', options: { color: C.dim } },
  ], { x: MX, y: 3.7, w: 9.6, h: 1.8, fontFace: FONT, fontSize: 21, lineSpacingMultiple: 1.4, valign: 'top' });
  s.addShape(pptx.ShapeType.roundRect, { x: MX, y: 6.55, w: 0.42, h: 0.42, rectRadius: 0.09, fill: { color: C.gold } });
  s.addText('W', { x: MX, y: 6.55, w: 0.42, h: 0.42, align: 'center', valign: 'middle', bold: true, color: '1A1206', fontSize: 18, fontFace: FONT });
  s.addText('WealthPulse   ·   Live demo on SingleStore', { x: MX + 0.55, y: 6.55, w: 8, h: 0.42, valign: 'middle', color: C.muted, fontSize: 13, fontFace: FONT });
}

/* ---------- Slide 2 · Context > model ---------- */
{
  const s = slide();
  eyebrow(s, 'Why the 95% of AI pilots stall');
  title(s, [{ text: 'Better ', options: { color: C.text } }, { text: 'context', options: { color: C.gold } }, { text: ' = better AI.', options: { color: C.text } }], 1.15, 44);

  const by = 2.5, bh = 1.85, bw = 5.75;
  box(s, MX, by, bw, bh);
  s.addText('✕  The myth', { x: MX + 0.3, y: by + 0.22, w: bw - 0.6, h: 0.4, color: C.neg, bold: true, fontSize: 17, fontFace: FONT });
  s.addText('"Better model = better AI." Teams chase the biggest model — and get a very smart, very confident wrong answer on stale data. Your agents are brilliant, and blind.',
    { x: MX + 0.3, y: by + 0.72, w: bw - 0.6, h: bh - 0.9, color: C.muted, fontSize: 14, fontFace: FONT, lineSpacingMultiple: 1.3, valign: 'top' });

  const bx2 = MX + bw + 0.35;
  box(s, bx2, by, bw, bh);
  s.addText('✓  The reality', { x: bx2 + 0.3, y: by + 0.22, w: bw - 0.6, h: 0.4, color: C.pos, bold: true, fontSize: 17, fontFace: FONT });
  s.addText([
    { text: 'An agent is only as good as the ', options: { color: C.muted } },
    { text: 'live truth it can see', options: { color: C.dim, bold: true } },
    { text: ' — your data, events, permissions and business logic, in the moment.', options: { color: C.muted } },
  ], { x: bx2 + 0.3, y: by + 0.72, w: bw - 0.6, h: bh - 0.9, fontSize: 14, fontFace: FONT, lineSpacingMultiple: 1.3, valign: 'top' });

  s.addText('THE REAL-TIME PATH — VALUE CAPTURED AS IT’S CREATED', { x: MX, y: 4.75, w: 12, h: 0.35, color: C.muted, bold: true, fontSize: 11.5, charSpacing: 2, fontFace: FONT });
  s.addText([
    { text: 'Event → ETL → Warehouse → Dashboard', options: { color: C.muted } },
    { text: '        vs        ', options: { color: C.muted } },
    { text: 'Event → Live decision', options: { color: C.gold2, bold: true } },
  ], { x: MX, y: 5.15, w: 12, h: 0.5, fontSize: 17, fontFace: FONT, valign: 'middle' });
  s.addText([
    { text: "The second you don't give away ", options: { color: C.dim } },
    { text: 'is the business model.', options: { color: C.gold2, bold: true } },
  ], { x: MX, y: 5.95, w: 12, h: 0.6, fontSize: 20, fontFace: FONT });
}

/* ---------- Slide 3 · What powers the demo ---------- */
{
  const s = slide();
  eyebrow(s, "What you're watching");
  title(s, [{ text: 'WealthPulse is ', options: { color: C.text } }, { text: 'Embedded Aura', options: { color: C.gold } }, { text: ' on live context.', options: { color: C.text } }], 1.15, 40);

  const by = 2.45, bw = 5.75, bh = 1.35;
  box(s, MX, by, bw, bh, { line: C.border });
  s.addText('ONE GOVERNED SINGLESTORE DATABASE', { x: MX + 0.3, y: by + 0.2, w: bw - 0.6, h: 0.3, color: C.gold, bold: true, fontSize: 11, charSpacing: 2, fontFace: FONT });
  s.addText('Transactions  ·  Analytics  ·  Search  ·  one copy, live', { x: MX + 0.3, y: by + 0.6, w: bw - 0.6, h: 0.6, color: C.dim, fontSize: 14.5, fontFace: FONT });

  const bx2 = MX + bw + 0.35;
  box(s, bx2, by, bw, bh, { fill: '15161E', line: C.gold });
  s.addText('SINGLESTORE CONTEXT ENGINE · KNOWLEDGE FABRIC', { x: bx2 + 0.3, y: by + 0.2, w: bw - 0.6, h: 0.3, color: C.gold, bold: true, fontSize: 11, charSpacing: 1.5, fontFace: FONT });
  s.addText('Business ontology  ·  schema crawling  ·  data sampling  ·  feedback loop  ·  model gateway (BYOK)', { x: bx2 + 0.3, y: by + 0.6, w: bw - 0.6, h: 0.65, color: C.dim, fontSize: 13, fontFace: FONT, lineSpacingMultiple: 1.2 });

  const fy = by + bh + 0.3;
  box(s, MX, fy, bw * 2 + 0.35, 1.05, { line: C.border });
  s.addText('ONE CONTEXT ENGINE  →  THREE OFFERINGS', { x: MX + 0.3, y: fy + 0.18, w: 11, h: 0.3, color: C.gold, bold: true, fontSize: 11, charSpacing: 2, fontFace: FONT });
  s.addText([
    { text: 'Embedded Aura — in-app Q&A (this demo)', options: { color: C.gold2, bold: true } },
    { text: '        Aura Copilot — analysts & BI        Aura Code — agents & MCPs', options: { color: C.dim } },
  ], { x: MX + 0.3, y: fy + 0.55, w: 11.3, h: 0.4, fontSize: 13.5, fontFace: FONT });

  s.addText([
    { text: 'Not a chatbot bolted onto a database — the ', options: { color: C.muted } },
    { text: 'intelligence-first', options: { color: C.text, bold: true } },
    { text: ' center of gravity. Enterprise-grade: ', options: { color: C.muted } },
    { text: 'multi-tenant, robust RBAC, BYOK, observability, best-in-class accuracy.', options: { color: C.dim, bold: true } },
  ], { x: MX, y: 6.35, w: 12, h: 0.8, fontSize: 14.5, fontFace: FONT, lineSpacingMultiple: 1.3, valign: 'top' });
}

/* ---------- Slide 4 · Value + close ---------- */
{
  const s = slide();
  eyebrow(s, 'What it means for you');
  title(s, [{ text: 'Revenue up.  ', options: { color: C.text } }, { text: 'Cost down.', options: { color: C.gold } }, { text: '  Risk down.', options: { color: C.text } }], 1.15, 40);

  const cy = 2.5, ch = 2.7, cw = 3.78, gap = 0.28;
  const cols = [
    { h: 'Revenue up', c: C.pos, items: ['Launch AI experiences faster', 'Real-time decisions capture the moment', 'Deliver what customers now expect'] },
    { h: 'Cost down', c: C.gold2, items: ['No data copies, no ETL, no point-solutions', 'Consolidate serving infrastructure', 'Leverage existing Iceberg / lakehouse'] },
    { h: 'Risk down', c: C.accent, items: ['Open — no lock-in, works with your lakehouse', 'Enterprise reliability & governance', 'Governed lakehouse stays source of truth'] },
  ];
  cols.forEach((col, i) => {
    const x = MX + i * (cw + gap);
    box(s, x, cy, cw, ch);
    s.addText(col.h, { x: x + 0.28, y: cy + 0.24, w: cw - 0.5, h: 0.4, color: col.c, bold: true, fontSize: 17, fontFace: FONT });
    ticks(s, col.items, x + 0.28, cy + 0.78, cw - 0.5);
  });

  s.addText([
    { text: "The winners of the agentic era won't have the most models. They'll have the ", options: { color: C.dim } },
    { text: 'fastest live context — a moat that compounds every day.', options: { color: C.gold2, bold: true } },
    { text: " That's Aura. Let's build yours.", options: { color: C.dim } },
  ], { x: MX, y: 5.7, w: 12, h: 1.2, fontSize: 19, fontFace: FONT, lineSpacingMultiple: 1.4, valign: 'top' });
}

await pptx.writeFile({ fileName: OUT });
console.log('wrote', OUT, '· 4 slides (editable)');
