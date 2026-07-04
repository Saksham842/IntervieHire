import fs from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import LegalDoc from '../../../src/legal/LegalDoc';

// Publishable legal documents, served at /legal/<slug>. Content ships in
// dashboard/content/legal/*.md (copied from the repo-root /legal/*.md source
// of truth — re-copy on change). Statically generated: the file read below
// runs at build time only.
const DOCS = {
  terms: { file: 'terms.md', title: 'Terms of Service' },
  privacy: { file: 'privacy.md', title: 'Privacy Policy' },
  dpa: { file: 'dpa.md', title: 'Data Processing Addendum' },
};

export const dynamic = 'force-static';

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }) {
  const { doc } = await params;
  const meta = DOCS[doc];
  return { title: meta ? `${meta.title} | intervieHire` : 'Legal | intervieHire' };
}

// Strip HTML comments (the template's internal "not publishable" notes) so they
// never reach the browser, then trim.
function stripComments(md) {
  return md.replace(/<!--[\s\S]*?-->/g, '').trim();
}

export default async function LegalPage({ params }) {
  const { doc } = await params;
  const meta = DOCS[doc];
  if (!meta) notFound();

  const filePath = path.join(process.cwd(), 'content', 'legal', meta.file);
  let raw = '';
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    raw = '';
  }

  return <LegalDoc title={meta.title} markdown={stripComments(raw)} />;
}
