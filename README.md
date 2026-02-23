# statement-adder

Stamps a confirmation statement into PDF treatment reports.
The text is inserted on page 1 at a fixed position defined in `config.json`.

## Requirements

- **Node.js** v16+ (tested on v24) — download the LTS installer from https://nodejs.org and run it with default settings
- Internet access on the **first run** only (to download `pdf-lib`)

## Usage

1. Place PDF reports in `input/`
2. Double-click **`run.bat`**
3. Pick up the results from `output/`

Originals in `input/` are never modified.

Or from the command line:

```bash
node add_statement.js                           # all PDFs in input/
node add_statement.js path/to/report.pdf        # specific file
```

## Example

The repo includes a sample PDF in `input/example1.pdf` and the corresponding output in `output/example1_with_statement.pdf` so you can see the result without running anything.

## Configuration (`config.json`)

| Key | Description |
|-----|-------------|
| `input_dir` | Directory to scan for PDFs (default: `./input`) |
| `output_dir` | Directory for processed PDFs (default: `./output`) |
| `statement` | Text to stamp. Use `\n` for paragraph breaks. Wrap text in `**double asterisks**` to make it **bold**. |
| `font_size` | Font size in points (default: 9) |
| `text_color_rgb` | RGB colour `[r, g, b]`, values 0–1 |
| `left_margin_pts` / `right_margin_pts` | Horizontal margins in points |
| `insert_y_from_top_pts` | Distance from page top to first line of text (A4 = 842 pt tall) |
| `line_height_multiplier` | Line spacing relative to font size (default: 1.4) |
| `paragraph_gap_multiplier` | Extra space between paragraphs (default: 0.8) |
| `output_suffix` | Suffix appended to output filenames (default: `_with_statement`) |
