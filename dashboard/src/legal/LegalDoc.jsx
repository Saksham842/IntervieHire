import React from 'react';

/*
 * Self-contained (dependency-free) Markdown renderer for the legal pages.
 * Supports the subset the legal docs use: #/##/### headings, paragraphs,
 * **bold**, *italic*, [text](url) links, "- " lists (incl. nested), GFM
 * "| a | b |" tables, "> " blockquotes, and "---" horizontal rules.
 * Source of truth for the content is /legal/*.md at the repo root; the copies
 * that ship live in dashboard/content/legal/*.md (re-copy them on change).
 */

const C = {
  bg: '#0A0A0A',
  text: '#D8D2C6',
  heading: '#F5F0E8',
  muted: '#888880',
  gold: '#C9A84C',
  line: 'rgba(201, 168, 76, 0.16)',
};

// ---- inline formatting: **bold**, *italic*, [text](url) ----
function renderInline(text, keyPrefix) {
  const out = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      out.push(<strong key={`${keyPrefix}-b${i++}`} style={{ color: C.heading, fontWeight: 600 }}>{m[2]}</strong>);
    } else if (m[3]) {
      out.push(<em key={`${keyPrefix}-i${i++}`}>{m[4]}</em>);
    } else if (m[5]) {
      const href = m[7];
      const external = /^https?:\/\//i.test(href);
      out.push(
        <a key={`${keyPrefix}-a${i++}`} href={href} style={{ color: C.gold, textDecoration: 'none' }}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{m[6]}</a>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isSep = (row) => /^[\s|:-]+$/.test(row) && row.includes('-');
const splitRow = (row) => {
  const cells = row.split('|');
  if (cells.length && cells[0].trim() === '') cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === '') cells.pop();
  return cells.map((c) => c.trim());
};

export function parseMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') { i++; continue; }

    // horizontal rule
    if (trimmed === '---' || trimmed === '***') { blocks.push({ type: 'hr' }); i++; continue; }

    // headings
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) { blocks.push({ type: 'h', level: h[1].length, text: h[2] }); i++; continue; }

    // table (consecutive lines starting with "|")
    if (trimmed.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim()); i++; }
      const header = splitRow(rows[0]);
      const bodyRows = rows.slice(1).filter((r) => !isSep(r)).map(splitRow);
      blocks.push({ type: 'table', header, rows: bodyRows });
      continue;
    }

    // blockquote
    if (trimmed.startsWith('>')) {
      const parts = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        parts.push(lines[i].trim().replace(/^>\s?/, '')); i++;
      }
      blocks.push({ type: 'quote', text: parts.join(' ') });
      continue;
    }

    // list ("- " or "* "), incl. nested (leading whitespace)
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || (lines[i].trim() !== '' && /^\s+/.test(lines[i]) && items.length))) {
        const li = lines[i];
        const mm = li.match(/^(\s*)[-*]\s+(.*)$/);
        if (mm) {
          items.push({ indent: Math.floor(mm[1].length / 2), text: mm[2] });
        } else if (items.length) {
          // continuation line wrapped under the previous item
          items[items.length - 1].text += ' ' + li.trim();
        }
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // paragraph: gather until blank / special line
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('>') &&
      !/^(#{1,6})\s+/.test(lines[i].trim()) &&
      lines[i].trim() !== '---'
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'p', lines: para });
  }
  return blocks;
}

function Block({ block, k }) {
  switch (block.type) {
    case 'hr':
      return <hr style={{ border: 'none', borderTop: `1px solid ${C.line}`, margin: '32px 0' }} />;
    case 'h': {
      if (block.level === 1) return <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, fontWeight: 700, color: C.heading, margin: '8px 0 20px', letterSpacing: '-0.01em' }}>{renderInline(block.text, k)}</h1>;
      if (block.level === 2) return <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 21, fontWeight: 600, color: C.heading, margin: '40px 0 12px', paddingBottom: 8, borderBottom: `1px solid ${C.line}` }}>{renderInline(block.text, k)}</h2>;
      return <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16.5, fontWeight: 600, color: '#E8E2D6', margin: '26px 0 8px' }}>{renderInline(block.text, k)}</h3>;
    }
    case 'quote':
      return <blockquote style={{ borderLeft: `3px solid ${C.gold}`, padding: '8px 16px', margin: '16px 0', background: 'rgba(255,255,255,0.02)', color: '#B8B2A6', fontSize: 14 }}>{renderInline(block.text, k)}</blockquote>;
    case 'list':
      return (
        <ul style={{ margin: '12px 0', paddingLeft: 22, listStyle: 'disc' }}>
          {block.items.map((it, idx) => (
            <li key={`${k}-li${idx}`} style={{ margin: '6px 0', marginLeft: it.indent * 20 }}>{renderInline(it.text, `${k}-li${idx}`)}</li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <div style={{ overflowX: 'auto', margin: '18px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
            <thead>
              <tr>
                {block.header.map((c, idx) => (
                  <th key={`${k}-th${idx}`} style={{ border: `1px solid ${C.line}`, padding: '8px 10px', textAlign: 'left', verticalAlign: 'top', background: 'rgba(201,168,76,0.06)', color: C.heading, fontWeight: 600 }}>{renderInline(c, `${k}-th${idx}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ridx) => (
                <tr key={`${k}-tr${ridx}`}>
                  {row.map((c, cidx) => (
                    <td key={`${k}-td${ridx}-${cidx}`} style={{ border: `1px solid ${C.line}`, padding: '8px 10px', textAlign: 'left', verticalAlign: 'top' }}>{renderInline(c, `${k}-td${ridx}-${cidx}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'p':
    default: {
      const allMeta = block.lines.length > 1 && block.lines.every((l) => /^\*\*.+?:\*\*/.test(l));
      return (
        <p style={{ margin: '14px 0' }}>
          {block.lines.map((l, idx) => (
            <React.Fragment key={`${k}-pl${idx}`}>
              {renderInline(l, `${k}-pl${idx}`)}
              {allMeta && idx < block.lines.length - 1 ? <br /> : idx < block.lines.length - 1 ? ' ' : null}
            </React.Fragment>
          ))}
        </p>
      );
    }
  }
}

export default function LegalDoc({ title, markdown }) {
  const blocks = parseMarkdown(markdown || '');
  return (
    <main style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'Outfit, sans-serif', fontSize: 15, lineHeight: 1.75 }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <a href="/" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', textDecoration: 'none' }}>
            <span style={{ color: '#F5F0E8' }}>intervie</span>
            <span style={{ color: '#FF6B35' }}>Hire</span>
          </a>
          <a href="/" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: C.muted, textDecoration: 'none' }}>← Back to home</a>
        </div>

        <div style={{ background: 'rgba(255,107,53,0.10)', border: '1px solid rgba(255,107,53,0.38)', color: '#FFB499', padding: '12px 16px', borderRadius: 8, fontSize: 13, lineHeight: 1.6, marginBottom: 32 }}>
          <strong style={{ color: '#FFD1BC' }}>Draft — pending legal review.</strong> This document is a template with
          placeholders still to be completed and is awaiting sign-off by qualified counsel. It is not yet legally effective.
        </div>

        {blocks.map((b, idx) => <Block key={`b${idx}`} block={b} k={`b${idx}`} />)}
      </div>
    </main>
  );
}
