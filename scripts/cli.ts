#!/usr/bin/env tsx
/**
 * Epistemology Engine — CLI
 * Mirrors the Console's command surface against the running backend + Gemini.
 * Run with: npm run cli
 * Requires the server to be running (npm run dev or npm run server).
 */

import readline from 'readline';
import { GoogleGenAI, Type } from '@google/genai';
import 'dotenv/config';
import { GEMINI_MODEL } from '../server/config.js';
import { applyDagreLayout } from '../src/lib/layout.js';

const API = 'http://localhost:3001/api';

// ─── ANSI ────────────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  violet: '\x1b[35m',
  cyan: '\x1b[36m',
  amber: '\x1b[33m',
};

const col = (color: string, text: string) => `${color}${text}${c.reset}`;
const dim = (t: string) => col(c.dim, t);
const bold = (t: string) => col(c.bold, t);
const normalizeTag = (t: string) => '#' + t.replace(/^#+/, '').toLowerCase().trim().replace(/\s+/g, '-');

// ─── API helpers ─────────────────────────────────────────────────────────────
async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, opts);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: false, status: res.status, data: { error: text.slice(0, 200) } }; }
}

async function getSources() {
  const r = await api('/sources');
  return r.ok ? r.data as any[] : [];
}

async function getExcerpts() {
  const r = await api('/excerpts/unsorted');
  return r.ok ? r.data as any[] : [];
}

async function getGraph() {
  const r = await api('/graph');
  return r.ok ? r.data as { nodes: any[]; edges: any[] } : { nodes: [], edges: [] };
}

async function extract(sourceId: string, query: string) {
  return api('/excerpts/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, query }),
  });
}

async function postNode(node: any) {
  return api('/graph/nodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(node),
  });
}

async function postEdge(edge: any) {
  return api('/graph/edges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edge),
  });
}

// ─── AI (same prompts as frontend aiEngine.ts) ───────────────────────────────
const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
});

async function aiQuery(cmd: string, nodes: any[], edges: any[], selectedIds: string[] = []) {
  const selectedNodes = nodes.filter(n => selectedIds.includes(n.id));
  const context = {
    graphSummary: `${nodes.length} nodes, ${edges.length} edges.`,
    selectedNodes: selectedNodes.map(n => ({ title: n.data?.title, type: n.type })),
  };
  const prompt = `You are the Console interface for the Epistemology Engine.
User Command: "${cmd}"

Context:
${JSON.stringify(context, null, 2)}

Respond concisely to the user's command. If they ask about the graph, analyze the structure provided. If they ask a factual question, ground it ONLY in the provided node data. If no data answers it, state that explicitly.`;

  const res = await gemini.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
  return res.text || '(no response)';
}

// ─── Output helpers ───────────────────────────────────────────────────────────
function printDivider() { console.log(dim('─'.repeat(60))); }

function printSource(s: any) {
  const icon = s.type === 'epub' ? col(c.blue, 'B') : s.type === 'jsonl' ? col(c.green, '{}') : col(c.red, '▶');
  console.log(`  ${icon}  ${bold(s.name)} ${dim(s.meta)}  ${dim(s.id)}`);
}

function printExcerpt(e: any, idx: number) {
  const icon = e.sourceType === 'epub' ? col(c.blue, 'B') : e.sourceType === 'jsonl' ? col(c.green, '{}') : col(c.red, '▶');
  console.log(`\n  ${dim(`[${idx + 1}]`)} ${icon} ${col(c.cyan, e.sourceName)} ${dim(e.location)}`);
  console.log(`      ${col(c.dim, '"')}${e.text.slice(0, 180)}${e.text.length > 180 ? '…' : ''}${col(c.dim, '"')}`);
  if (e.tags?.length) console.log(`      ${e.tags.map((t: string) => col(c.violet, t)).join(' ')}`);
}

function printNode(n: any) {
  const typeColors: any = { concept: c.blue, branch: c.violet, source: c.green, claim: c.yellow };
  const color = typeColors[n.type] || c.reset;
  const refs = n.type === 'claim'
    ? `sup:${n.data?.supportingEvidence?.length ?? 0} con:${n.data?.counterEvidence?.length ?? 0}`
    : `refs:${(n.data?.references?.literature?.length ?? 0) + (n.data?.references?.media?.length ?? 0)}`;
  console.log(`  ${col(color, n.type.toUpperCase().padEnd(8))} ${bold(n.data?.title ?? '?')}  ${dim(refs)}`);
}

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function fmtTokens(tok: { prompt: number; output: number }): string {
  const total = tok.prompt + tok.output;
  const k = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  return `${k(total)} tok (↑${k(tok.prompt)} ↓${k(tok.output)})`;
}

function printLog(log: any[]) {
  console.log();
  for (const entry of log) {
    if (entry.step === 'source_profile') {
      const dbNote = entry.ms != null ? dim(` [${entry.ms}ms db]`) : '';
      if (entry.profile) {
        const p = entry.profile;
        const title = (p.title ?? '?').slice(0, 55) + ((p.title?.length ?? 0) > 55 ? '…' : '');
        console.log(`  ${dim('source:')}   ${bold(title)}  ${dim(p.era ?? '')}${dbNote}`);
        console.log(`  ${dim('style:')}    ${col(c.dim, p.language_style ?? '?')}`);
        console.log(`  ${dim('domain:')}   ${col(c.dim, p.domain ?? '?')}`);
        if (p.vocabulary_notes) {
          const note = (p.vocabulary_notes as string).replace(/\s+/g, ' ').trim();
          console.log(`  ${dim('vocab:')}    ${col(c.dim, note.slice(0, 180))}${note.length > 180 ? dim('…') : ''}`);
        }
      } else {
        console.log(`  ${dim('source:')}   ${dim('no profile — expansion will use generic synonyms')}${dbNote}`);
      }
      console.log();
    } else if (entry.step === 'recall') {
      const meta = [fmtMs(entry.ms), fmtTokens(entry.tokens)].filter(Boolean).join(' · ');
      const mode = entry.canRecall
        ? col(c.green, `recall  ·  ${entry.recalled} passages`)
        : col(c.yellow, 'unknown source — falling back to keyword scan');
      console.log(`  ${dim('topic:')}    ${bold(entry.topic)}  ${dim(`[${meta}]`)}`);
      console.log(`  ${dim('mode:')}     ${mode}`);
    } else if (entry.step === 'passage') {
      const statusIcon = entry.status === 'inserted'
        ? col(c.green, '+')
        : entry.status === 'duplicate'
          ? col(c.dim, '=')
          : col(c.red, '✗');
      const statusLabel = entry.status === 'unverified' ? dim(' (not in DB — skipped)') : '';
      console.log();
      console.log(`  ${statusIcon} ${col(c.cyan, entry.reference ?? '?')}${statusLabel}  ${dim(`[${fmtMs(entry.ms)}]`)}`);
      console.log(`    ${col(c.dim, '"')}${(entry.preview ?? '').slice(0, 160)}…${col(c.dim, '"')}`);
      if (entry.why) console.log(`    ${dim('why:')} ${col(c.dim, entry.why)}`);
      if (entry.tags?.length) console.log(`    ${entry.tags.map((t: string) => col(c.violet, normalizeTag(t))).join(' ')}`);
    } else if (entry.step === 'fallback_reason') {
      console.log();
      console.log(`  ${col(c.yellow, '↓ fallback')}  ${dim(entry.reason)}`);
      console.log();
    } else if (entry.step === 'keywords') {
      const meta = [fmtMs(entry.ms), fmtTokens(entry.tokens)].filter(Boolean).join(' · ');
      console.log(`  ${dim('topic:')}    ${bold(entry.topic)}  ${dim(`[${meta}]`)}`);
      console.log(`  ${dim('terms:')}    ${entry.terms.map((t: string) => col(c.cyan, t)).join('  ')}`);
    } else if (entry.step === 'filter') {
      const method = entry.method === 'fallback'
        ? col(c.yellow, 'fallback sampling')
        : col(c.green, 'keyword match');
      console.log(`  ${dim('filter:')}   ${method} → ${bold(String(entry.chapters.length))} chapters  ${dim(`[${fmtMs(entry.ms)} db]`)}`);
    } else if (entry.step === 'chapter') {
      console.log();
      if (entry.error) {
        console.log(`  ${col(c.red, '✗')} ${bold(entry.title)}  ${dim(`[${fmtMs(entry.ms)}]`)} — AI error`);
        continue;
      }

      const status = entry.aiFound === 0 ? col(c.dim, '○') : col(c.green, '+');
      const dupeNote = entry.duplicates > 0 ? dim(` · ${entry.duplicates} dupe${entry.duplicates > 1 ? 's' : ''} skipped`) : '';
      const meta = [fmtMs(entry.ms), fmtTokens(entry.tokens)].filter(Boolean).join(' · ');
      console.log(`  ${status} ${bold(entry.title)}${dupeNote}  ${dim(`[${meta}]`)}`);

      if (entry.reasoning) {
        const reasoning = entry.reasoning.replace(/\s+/g, ' ').trim();
        console.log(`    ${col(c.amber, '↳ reasoning:')} ${col(c.dim, reasoning.slice(0, 300))}${reasoning.length > 300 ? dim('…') : ''}`);
      }

      if (entry.excerpts?.length > 0) {
        for (const exc of entry.excerpts) {
          const text = exc.text.replace(/\s+/g, ' ').trim();
          console.log(`    ${col(c.cyan, '↳')} ${text.slice(0, 180)}${text.length > 180 ? '…' : ''}`);
          if (exc.why) {
            console.log(`       ${col(c.dim, 'why:')} ${col(c.dim, exc.why)}`);
          }
          if (exc.tags?.length) {
            console.log(`       ${exc.tags.map((t: string) => col(c.violet, normalizeTag(t))).join(' ')}`);
          }
        }
      } else {
        console.log(`    ${dim('↳ nothing extracted')}`);
      }
    } else if (entry.step === 'summary') {
      const t = entry.totalTokens;
      const total = t.prompt + t.output;
      const k = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
      console.log();
      console.log(dim('  ─'.repeat(30)));
      console.log(`  ${dim('total:')}    ${bold(fmtMs(entry.totalMs))}  ·  ${bold(k(total))} tokens  ${dim(`(↑${k(t.prompt)} prompt  ↓${k(t.output)} output)`)}`);
    }
  }
  console.log();
}

function printHelp() {
  printDivider();
  console.log(bold('Commands'));
  printDivider();
  const cmds = [
    ['sources', 'List all imported sources'],
    ['dock', 'Show unsorted excerpts in the Dock'],
    ['graph', 'Show graph summary (nodes + edges)'],
    ['@<source> <query>', 'Search a source and extract excerpts to Dock'],
    ['scaffold: <topic>', 'AI builds a thought web skeleton for a topic'],
    ['synthesize <title>', 'AI synthesis on a node (by title)'],
    ['<anything>', 'General AI query about your graph'],
    ['help', 'Show this help'],
    ['exit / quit', 'Exit the CLI'],
  ];
  cmds.forEach(([cmd, desc]) => {
    console.log(`  ${col(c.cyan, cmd.padEnd(26))} ${dim(desc)}`);
  });
  printDivider();
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log();
  console.log(bold('  ✦ Epistemology Engine — CLI'));
  console.log(dim('  Type `help` for available commands.\n'));

  // Quick server health check
  try {
    await fetch(`${API}/sources`, { signal: AbortSignal.timeout(2000) });
  } catch {
    console.error(col(c.red, '  ✗ Cannot reach server at localhost:3001. Is `npm run dev` running?\n'));
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = () => rl.question(`\n${col(c.blue, '›')} `, handleLine);

  async function handleLine(raw: string) {
    const input = raw.trim();

    if (!input) { prompt(); return; }

    if (input === 'exit' || input === 'quit') {
      console.log(dim('\n  Goodbye.\n'));
      rl.close();
      process.exit(0);
    }

    if (input === 'help') {
      printHelp();
      prompt();
      return;
    }

    // ── sources ──────────────────────────────────────────────────────────────
    if (input === 'sources') {
      const sources = await getSources();
      printDivider();
      if (!sources.length) {
        console.log(dim('  No sources imported yet.'));
      } else {
        console.log(bold(`  ${sources.length} source${sources.length > 1 ? 's' : ''}`));
        sources.forEach(printSource);
      }
      printDivider();
      prompt();
      return;
    }

    // ── dock ─────────────────────────────────────────────────────────────────
    if (input === 'dock') {
      const excerpts = await getExcerpts();
      printDivider();
      if (!excerpts.length) {
        console.log(dim('  Dock is empty.'));
      } else {
        console.log(bold(`  ${excerpts.length} unsorted excerpt${excerpts.length > 1 ? 's' : ''}`));
        excerpts.slice(0, 20).forEach(printExcerpt);
        if (excerpts.length > 20) console.log(dim(`\n  … and ${excerpts.length - 20} more`));
      }
      printDivider();
      prompt();
      return;
    }

    // ── graph ─────────────────────────────────────────────────────────────────
    if (input === 'graph') {
      const { nodes, edges } = await getGraph();
      printDivider();
      console.log(bold(`  Graph: ${nodes.length} nodes, ${edges.length} edges`));
      if (nodes.length) { console.log(); nodes.forEach(printNode); }
      printDivider();
      prompt();
      return;
    }

    // ── @source <query> ───────────────────────────────────────────────────────
    const scopeMatch = input.match(/^@(\S+)\s+(.+)$/);
    if (scopeMatch) {
      const [, handle, query] = scopeMatch;
      const sources = await getSources();
      const source = sources.find((s: any) =>
        s.name.toLowerCase().includes(handle.toLowerCase())
      );
      if (!source) {
        console.log(col(c.red, `  ✗ No source matching "@${handle}". Run \`sources\` to see available.`));
        prompt();
        return;
      }
      console.log(dim(`  Searching "${source.name}" for "${query}"…`));
      const r = await extract(source.id, query);
      printDivider();
      if (!r.ok) {
        console.log(col(c.red, `  ✗ ${r.data?.error ?? 'Extract failed.'}`));
      } else {
        const icon = r.data.count > 0 ? col(c.green, '✓') : col(c.yellow, '○');
        console.log(`  ${icon} ${r.data.message}`);
        if (r.data.log?.length) {
          printLog(r.data.log);
        }
      }
      printDivider();
      prompt();
      return;
    }

    // ── scaffold: <topic> ─────────────────────────────────────────────────────
    const scaffoldMatch = input.match(/^scaffold:\s*(.+)$/i);
    if (scaffoldMatch) {
      const topic = scaffoldMatch[1].trim();
      console.log(dim(`  Building scaffold for "${topic}"…`));
      try {
        const { nodes: existingNodes } = await getGraph();
        const existingTitles = existingNodes.map((n: any) => n.data?.title).filter(Boolean);
        const contextNote = existingTitles.length
          ? `\n\nExisting nodes on the graph (avoid duplicating these titles): ${existingTitles.join(', ')}`
          : '';

        const scaffoldResponse = await gemini.models.generateContent({
          model: GEMINI_MODEL,
          contents: `You are a knowledge graph architect. Build a thought web skeleton for a researcher exploring this topic: "${topic}".${contextNote}

Rules:
- Create 6 to 9 nodes total
- Mix node types: "concept" for core ideas or themes, "branch" for sub-areas worth exploring separately, "claim" for specific propositions that can be argued for or against
- Titles: 2 to 5 words, punchy and specific
- Descriptions: 1 to 2 sentences explaining the node's role in this web of ideas
- Create 5 to 10 edges with typed relationships
- Designate one node as rootId — the central organizing concept all others relate to
- For each edge relationType, choose exactly one of: "supports", "contradicts", "refines", "prerequisite", "extends"`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                rootId: { type: Type.STRING },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      tempId: { type: Type.STRING },
                      type: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                    },
                    required: ['tempId', 'type', 'title', 'description'],
                  },
                },
                edges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      from: { type: Type.STRING },
                      to: { type: Type.STRING },
                      relationType: {
                        type: Type.STRING,
                        enum: ['supports', 'contradicts', 'refines', 'prerequisite', 'extends'],
                      },
                    },
                    required: ['from', 'to', 'relationType'],
                  },
                },
              },
              required: ['topic', 'rootId', 'nodes', 'edges'],
            },
          },
        });

        const result = JSON.parse(scaffoldResponse.text ?? '{}');
        if (!result?.nodes?.length) throw new Error('No nodes returned from AI.');

        // Placement offset: spawn to the right of existing nodes, or at origin if canvas is empty
        let centerX = 0, centerY = 0;
        if (existingNodes.length > 0) {
          const maxX = Math.max(...existingNodes.map((n: any) => (n.position?.x ?? 0) + 300));
          const avgY = existingNodes.reduce((sum: number, n: any) => sum + (n.position?.y ?? 0) + 60, 0) / existingNodes.length;
          centerX = maxX + 400; // Smaller offset for cluster
          centerY = avgY;
        }

        // Dagre layout — superior topological engine with semantic weighting
        const positions = applyDagreLayout(
          result.nodes.map((n: any) => n.tempId),
          result.edges.map((e: any) => ({ source: e.from, target: e.to, relationType: e.relationType })),
          {
            direction: 'LR',
            ranker: 'network-simplex',
            nodesep: 60,
            ranksep: 120,
            semanticWeighting: true,
            center: { x: centerX, y: centerY }
          },
        );

        const idMap: Record<string, string> = {};
        const ts = Date.now();
        result.nodes.forEach((n: any, i: number) => { idMap[n.tempId] = `n-${ts}-${i}`; });

        // Create nodes
        for (const n of result.nodes) {
          const nodeData: any = {
            title: n.title,
            description: n.description,
            expanded: false,
            tags: ['#scaffold'],
          };
          if (n.type === 'claim') {
            nodeData.conviction = 50;
            nodeData.supportingEvidence = [];
            nodeData.counterEvidence = [];
          } else {
            nodeData.references = { literature: [], media: [] };
          }
          await postNode({
            id: idMap[n.tempId],
            type: n.type,
            position: positions[n.tempId] ?? { x: 0, y: 0 },
            data: nodeData,
          });
        }

        // Create edges
        let edgeCount = 0;
        for (const [i, e] of result.edges.entries()) {
          if (!idMap[e.from] || !idMap[e.to]) continue;
          await postEdge({
            id: `e-${ts}-${i}`,
            source: idMap[e.from],
            target: idMap[e.to],
            data: { relationType: e.relationType || 'extends' },
          });
          edgeCount++;
        }

        printDivider();
        console.log(`  ${col(c.green, '✓')} Scaffold created: ${bold(result.topic)}`);
        console.log(`  ${dim(`${result.nodes.length} nodes · ${edgeCount} connections`)}\n`);
        for (const n of result.nodes) {
          const typeColors: any = { concept: c.blue, branch: c.violet, claim: c.yellow };
          const color = typeColors[n.type] || c.reset;
          const isRoot = n.tempId === result.rootId ? col(c.amber, ' ★') : '';
          console.log(`  ${col(color, n.type.padEnd(8))} ${bold(n.title)}${isRoot}`);
          console.log(`           ${dim(n.description.slice(0, 120))}`);
        }
        console.log(dim('\n  Reload the canvas to see the scaffold.'));
        printDivider();
      } catch (err: any) {
        console.log(col(c.red, `  ✗ Scaffold failed: ${err.message}`));
      }
      prompt();
      return;
    }

    // ── synthesize <title> ────────────────────────────────────────────────────
    const synthMatch = input.match(/^synthesize\s+(.+)$/i);
    if (synthMatch) {
      const title = synthMatch[1].trim();
      const { nodes } = await getGraph();
      const node = nodes.find((n: any) =>
        n.data?.title?.toLowerCase() === title.toLowerCase()
      );
      if (!node) {
        console.log(col(c.red, `  ✗ No node titled "${title}". Run \`graph\` to see all nodes.`));
        prompt();
        return;
      }
      console.log(dim(`  Synthesizing "${node.data.title}"…`));
      try {
        let synthesis = '';
        if (node.type === 'concept' || node.type === 'branch') {
          const refs = [
            ...(node.data.references?.literature || []),
            ...(node.data.references?.media || []),
          ].map((r: any) => r.text || '').filter(Boolean);
          if (!refs.length) throw new Error('No references attached to this node.');
          const synthPrompt = `You are the synthesis engine for an epistemology knowledge graph.
The user is developing a concept called "${node.data.title}".
Here are the extracted excerpts attached to this concept:
${refs.map((r: string, i: number) => `[${i + 1}] "${r}"`).join('\n')}
Provide a single, powerful connective paragraph (max 400 characters) that synthesizes these points into a unified epistemological insight. Identify patterns or tensions. Do not use preamble.`;
          const r = await gemini.models.generateContent({ model: GEMINI_MODEL, contents: synthPrompt });
          synthesis = r.text || '';
        } else if (node.type === 'claim') {
          const sup = (node.data.supportingEvidence || []).map((r: any) => r.text || '').filter(Boolean);
          const con = (node.data.counterEvidence || []).map((r: any) => r.text || '').filter(Boolean);
          const synthPrompt = `You are the synthesis engine for an epistemology knowledge graph.
The user is evaluating the claim: "${node.data.title}".
Supporting Evidence:
${sup.length ? sup.map((r: string, i: number) => `[${i + 1}] "${r}"`).join('\n') : 'None.'}
Counterevidence:
${con.length ? con.map((r: string, i: number) => `[${i + 1}] "${r}"`).join('\n') : 'None.'}
Provide a single paragraph (max 500 characters) that weighs both sides. Articulate the strongest version of the claim, the strongest objection, and where the balance of evidence sits. No preamble.`;
          const r = await gemini.models.generateContent({ model: GEMINI_MODEL, contents: synthPrompt });
          synthesis = r.text || '';
        } else {
          console.log(col(c.yellow, `  ○ Synthesis not available for ${node.type} nodes.`));
          prompt();
          return;
        }
        printDivider();
        console.log(col(c.blue, '  ✦ Synthesis'));
        console.log(`\n  ${synthesis.trim().replace(/\n/g, '\n  ')}\n`);
        printDivider();
      } catch (err: any) {
        console.log(col(c.red, `  ✗ ${err.message}`));
      }
      prompt();
      return;
    }

    // ── general AI query ──────────────────────────────────────────────────────
    console.log(dim('  Querying engine…'));
    try {
      const { nodes, edges } = await getGraph();
      const response = await aiQuery(input, nodes, edges);
      printDivider();
      console.log(`\n  ${response.trim().replace(/\n/g, '\n  ')}\n`);
      printDivider();
    } catch (err: any) {
      console.log(col(c.red, `  ✗ ${err.message}`));
    }
    prompt();
  }

  prompt();
}

main();
