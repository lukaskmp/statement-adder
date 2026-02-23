'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Auto-install pdf-lib on first run
if (!fs.existsSync(path.join(__dirname, 'node_modules', 'pdf-lib'))) {
  console.log('Installing pdf-lib (one-time)...');
  execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
}

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// Resolve directories
const inputDir = path.resolve(__dirname, cfg.input_dir);
const outputDir = path.resolve(__dirname, cfg.output_dir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Resolve input PDFs: CLI args or all PDFs in input_dir
const inputFiles = process.argv.length > 2
  ? process.argv.slice(2).map(f => path.resolve(f))
  : fs.readdirSync(inputDir).filter(f => /\.pdf$/i.test(f)).map(f => path.join(inputDir, f));

// Parse **bold** markers into segments: [{text, bold}, ...]
function parseSegments(text) {
  const segs = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index), bold: false });
    segs.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ text: text.slice(last), bold: false });
  return segs;
}

// Merge adjacent same-style words into drawing segments
function mergeWords(words) {
  const segs = [];
  for (const { word, bold } of words) {
    if (segs.length > 0 && segs[segs.length - 1].bold === bold) {
      segs[segs.length - 1].text += ' ' + word;
    } else {
      segs.push({ text: (segs.length > 0 ? ' ' : '') + word, bold });
    }
  }
  return segs;
}

// Word-wrap with bold support. Returns array of segment arrays (or null for paragraph gaps).
function wrap(text, regular, bold, size, maxWidth) {
  const paragraphs = text.split('\n');
  const lines = [];
  const spaceW = regular.widthOfTextAtSize(' ', size);

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const words = [];
    for (const seg of parseSegments(paragraphs[pi]))
      for (const w of seg.text.split(/\s+/).filter(Boolean))
        words.push({ word: w, bold: seg.bold });

    let lineWords = [], lineWidth = 0;
    for (const { word, bold: b } of words) {
      const ww = (b ? bold : regular).widthOfTextAtSize(word, size);
      const extra = lineWords.length > 0 ? spaceW : 0;
      if (lineWidth + extra + ww > maxWidth && lineWords.length > 0) {
        lines.push(mergeWords(lineWords));
        lineWords = [{ word, bold: b }];
        lineWidth = ww;
      } else {
        lineWords.push({ word, bold: b });
        lineWidth += extra + ww;
      }
    }
    if (lineWords.length > 0) lines.push(mergeWords(lineWords));
    if (pi < paragraphs.length - 1) lines.push(null);
  }
  return lines;
}

(async () => {
  for (const input of inputFiles) {
    const doc = await PDFDocument.load(fs.readFileSync(input));
    const page = doc.getPages()[0];
    const { width, height } = page.getSize();
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const size = cfg.font_size;
    const maxWidth = width - cfg.left_margin_pts - cfg.right_margin_pts;
    const lineH = size * cfg.line_height_multiplier;
    const paraGap = size * cfg.paragraph_gap_multiplier;
    const color = rgb(...cfg.text_color_rgb);

    let y = height - cfg.insert_y_from_top_pts;
    for (const line of wrap(cfg.statement, regular, bold, size, maxWidth)) {
      if (line === null) { y -= paraGap; continue; }
      let x = cfg.left_margin_pts;
      for (const seg of line) {
        const font = seg.bold ? bold : regular;
        page.drawText(seg.text, { x, y, size, font, color });
        x += font.widthOfTextAtSize(seg.text, size);
      }
      y -= lineH;
    }

    const stem = path.basename(input, path.extname(input));
    const out = path.join(outputDir, stem + (cfg.output_suffix || '') + '.pdf');
    fs.writeFileSync(out, await doc.save());
    console.log('Saved:', out);
  }
})();
