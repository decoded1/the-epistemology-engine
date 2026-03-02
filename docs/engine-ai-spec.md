# The Engine

**AI Integration Layer — UX Workflow Specification**

---

## Overview

The Engine is the AI layer woven through every surface of the Epistemology Engine. It is not a chatbot. It is not a sidebar assistant. It is a retrieval and reasoning system that operates on your knowledge graph — your sources, your nodes, your edges, your claims — and helps you find, connect, and challenge what you know.

The Engine has no dedicated UI. It lives inside the Console, inside node drawers, inside the Dock, and inside the ingestion pipeline. When you type a query in the Console, the Engine searches your library. When you ask it to synthesize a node, it reads every attached excerpt and produces connective reasoning. When you import a new source, the Engine extracts and tags excerpts automatically. It is infrastructure, not interface.

This is a deliberate design decision. AI that lives in its own panel trains people to "go talk to the AI" as a separate activity. AI that lives inside the tools you are already using becomes invisible — it just makes the tools smarter. The Engine should feel like the graph itself is intelligent, not like there is a second entity in the room.

---

## Core Capabilities

The Engine operates across five domains. Each domain corresponds to a real task a researcher performs while building a knowledge graph.

### 1. Retrieval

**What it does:** Searches your library of imported sources to find specific passages, excerpts, or segments that match a query.

**Where it surfaces:** The Console (via `@mention` scoped queries), the Dock (as search results), and node drawers (as suggested additions).

Retrieval is the Engine's most fundamental capability. When you type `find excerpts on "free will" in @kjv.jsonl` into the Console, the Engine performs a semantic search across the specified source and returns matching passages ranked by relevance. Results land in the Dock as new excerpt cards with `NEW` status badges, ready to be triaged and assigned to nodes.

Retrieval is not keyword matching. The Engine understands meaning. A query for "personal agency" will surface passages about self-determination, willpower, autonomy, and internal locus of control even if none of those exact words appear in the query. This is what makes the `@mention` scoping powerful — you are not searching a file, you are asking a question of it.

**Scoped retrieval** — when you `@mention` a specific source, the Engine restricts its search to that file. This is useful when you know which book or video contains what you are looking for.

**Unscoped retrieval** — when you query without an `@mention`, the Engine searches across your entire library. This is useful for discovery — "what have I read about cognitive biases?" will surface results from every imported source that touches the topic.

**Node-contextual retrieval** — when a node is selected on the canvas and you query the Console, the Engine uses the node's title, description, and existing references as additional context. A query for "more evidence" on a selected Claim node will search for passages that are semantically related to the claim's existing supporting and counterevidence. This is retrieval with awareness of what you already have.

---

### 2. Synthesis

**What it does:** Reads the references attached to a node and generates a connective paragraph that identifies patterns, tensions, and through-lines across the excerpts.

**Where it surfaces:** Inside the expanded drawer of Concept, Branch, and Claim nodes.

Synthesis is the Engine's most visible capability. When a Concept node called "Cognitive Reappraisal" has three literature references and one media reference, the Engine can read all four and produce a paragraph that explains how they relate to each other and to the concept itself.

A good synthesis is not a summary. It does not restate the excerpts. It identifies what the excerpts share, where they diverge, and what they collectively suggest about the concept. If two references agree on a principle but frame it differently, the synthesis should articulate the shared principle and note the framing difference. If one reference contradicts another, the synthesis should surface the tension explicitly.

**Synthesis on Concept and Branch nodes** — the Engine reads all attached excerpts (literature and media) and produces a single connective paragraph. The synthesis is stored on the node and displayed at the top of the drawer. It can be regenerated at any time if new references are added.

**Synthesis on Claim nodes** — the Engine reads both the supporting evidence and counterevidence sections separately, then produces a synthesis that weighs both sides. The output should articulate the strongest version of the claim, the strongest objection to it, and where the balance of evidence currently sits. This synthesis is opinionated by design — it helps you stress-test your conviction, not confirm it.

**Synthesis across edges** — when two nodes are selected and the Console enters edge mode, the Engine can propose a relationship between them. It reads both nodes' content and suggests an edge type (supports, contradicts, refines, prerequisite, extends) along with a one-sentence rationale. The user accepts, rejects, or modifies the suggestion.

---

### 3. Extraction

**What it does:** Processes raw source files (epub, JSONL, YouTube transcripts) and pulls out discrete excerpts with metadata.

**Where it surfaces:** The ingestion pipeline (triggered from the Console), with results landing in the Dock.

When you import a source file, the Engine does not dump the entire text into the system. It reads the content and identifies passage boundaries — statements, arguments, quotes, and ideas that are self-contained enough to function as standalone excerpts. Each extracted excerpt is tagged with:

- **Source reference** — the file it came from, with a precise location (chapter, page, verse, timestamp).
- **Auto-generated tags** — one to three topic tags inferred from the content (e.g., `#epistemology`, `#perception`, `#resilience`). These are suggestions, not permanent labels — the user can modify or remove them.
- **Format-specific metadata** — for literature, this is chapter and page or verse number. For media, this is a start timestamp and optionally an end timestamp defining the segment.

Extraction quality depends on the source format.

**Epub files** — the Engine parses the document structure (chapters, sections, paragraphs) and uses structural cues alongside semantic understanding to identify meaningful passages. A single paragraph that makes a self-contained point becomes one excerpt. A multi-paragraph argument may be grouped into one excerpt or split into several depending on coherence.

**JSONL files** — each line is treated as a pre-structured entry. The Engine reads the fields and maps them to the excerpt schema. A JSONL file of Bible verses, for example, has one excerpt per verse with the book, chapter, and verse number as location metadata.

**YouTube transcripts** — the Engine processes the timestamped transcript and segments it into topical chunks. A three-hour podcast does not become 10,000 individual sentences — the Engine identifies topic shifts and groups contiguous segments into coherent excerpts, each with a start timestamp.

**Extraction is not exhaustive.** The Engine does not extract every sentence from a 300-page book. It extracts passages that contain ideas, arguments, claims, or notable observations. Narrative connective tissue, table of contents entries, and filler content are skipped. The goal is a curated set of meaningful excerpts, not a line-by-line reproduction of the source.

---

### 4. Suggestion

**What it does:** Proactively identifies opportunities to strengthen the graph — missing connections, under-supported claims, related concepts, and potential contradictions.

**Where it surfaces:** The Console (as ambient suggestions), node drawers (as prompts), and the Dock (as prioritization hints).

Suggestion is the Engine's most opinionated capability. Where retrieval waits for a query and synthesis waits for a trigger, suggestion runs in the background and surfaces ideas when they are relevant.

**Connection suggestions** — when you create a new node, the Engine scans the existing graph for nodes that are likely related. If you create a Branch node called "Negative Visualization" under a Concept node called "Stoicism," the Engine might suggest connecting it to an existing Claim node called "Anxiety is anticipatory" with a "supports" edge. The suggestion appears as a subtle prompt in the Console: `Suggested: link "Negative Visualization" → "Anxiety is anticipatory" (supports)`.

**Evidence gap detection** — when a Claim node has supporting evidence but no counterevidence, the Engine notes the imbalance. It does not generate fake counterevidence — it searches your library for passages that might challenge the claim. If it finds candidates, they appear in the Dock as suggested excerpts with a tag indicating they were surfaced as potential counterevidence. If it finds nothing in your library, it may note that the claim is currently one-sided and suggest sources that might contain opposing perspectives.

**Tag propagation** — when you tag a node with `#stoicism` and the Engine notices that several connected nodes share related excerpts but lack the tag, it suggests propagating the tag. This keeps the tagging system consistent without requiring you to manually tag every node.

**Orphan resolution** — when excerpts sit in the Dock for an extended period, the Engine periodically scans them against the current graph and suggests node assignments. An excerpt about "spaced repetition" that has been orphaned for three days might trigger a suggestion: `This excerpt may belong on your "Learning Strategies" concept node.`

**Concept emergence** — the most ambitious suggestion type. When the Engine detects a cluster of excerpts across multiple sources that share a common theme not yet represented by a node, it suggests creating a new Concept node. If five excerpts from three different books all touch on the relationship between language and thought, and no node in your graph captures that idea, the Engine might suggest: `Emerging pattern: "Linguistic Relativity" — 5 excerpts across 3 sources.` The user can accept the suggestion (which creates the node and pre-populates it with the relevant excerpts) or dismiss it.

---

### 5. Interrogation

**What it does:** Answers questions about your knowledge graph — what it contains, how it is structured, where the gaps are, and what it implies.

**Where it surfaces:** The Console, as natural language Q&A.

Interrogation treats your graph as a queryable database. Instead of manually navigating nodes and expanding drawers to find information, you can ask the Engine questions and receive answers grounded in your own collected knowledge.

**Factual queries** — "What did Seneca say about suffering?" The Engine searches all nodes and excerpts linked to Seneca's works and returns the relevant passages with their node locations. This is retrieval, but the results are presented as a direct answer in the Console rather than as Dock items.

**Structural queries** — "Which claims have no counterevidence?" The Engine scans all Claim nodes and returns a list of those with an empty counterevidence section. This is graph introspection — asking about the shape of your knowledge, not the content of it.

**Comparative queries** — "How does Marcus Aurelius' view of control differ from Epictetus'?" The Engine identifies excerpts from both sources that address the topic of control, compares them, and articulates the differences. The answer is grounded entirely in your imported sources, not in the Engine's general knowledge. It tells you what *your library* says, not what the internet says.

**Implication queries** — "If I accept the claim that suffering is self-generated, what does that imply about the claim that trauma is externally caused?" The Engine traces the edges in your graph between these two claims, reads the evidence on both sides, and surfaces the logical tension. It does not resolve the tension — it makes it visible and articulable.

**Gap queries** — "What topics in my graph have the least evidence?" The Engine ranks nodes by reference count and surfaces those with the fewest attached excerpts. This helps you identify where your knowledge is thin and where additional reading or research would have the most impact.

---

## Interaction Patterns

The Engine communicates through three interaction patterns, never through a chat interface.

### Inline Results

When the Engine retrieves excerpts, suggests connections, or answers a query, the results appear inline in the appropriate surface — the Dock for excerpts, the Console for answers, the node drawer for synthesis. Results are never displayed in a separate AI panel or conversation thread.

### Ambient Suggestions

Low-priority suggestions (tag propagation, orphan resolution, connection suggestions) appear as subtle indicators rather than interruptions. A small dot on the Console, a badge on a Dock card, a muted hint line below a node title. The user can engage with them or ignore them. They never block workflow.

### Triggered Actions

High-priority actions (synthesis, targeted retrieval, interrogation queries) are always user-initiated. The Engine does not synthesize a node until asked. It does not search your library until prompted. The user controls when the Engine does heavy work. This prevents the system from feeling autonomous or unpredictable.

---

## Interaction Flows

### Flow 1: Research Sprint on a New Topic

1. User imports three sources via the Console: an epub of Kahneman's "Thinking, Fast and Slow," a JSONL file of research paper excerpts, and a YouTube transcript of a lecture on decision-making.
2. The Engine extracts excerpts from all three sources. The ingestion toast shows progress. Excerpts land in the Dock with auto-generated tags.
3. User creates a Concept node: "Cognitive Bias."
4. User types in the Console: `find relevant excerpts for this node`. The Engine searches the entire library using the node's title and description as context.
5. Results appear in the Dock, prioritized by relevance. User triages them, assigning strong matches to the Concept node.
6. User asks the Engine to synthesize the node. The synthesis paragraph identifies the common thread across Kahneman's heuristics, the research paper's experimental findings, and the lecture's practical examples.
7. The Engine suggests two new Branch nodes based on the clustering of attached excerpts: "Anchoring Effect" and "Availability Heuristic." User accepts both. The Engine pre-populates them with the relevant excerpts from the parent Concept node.

### Flow 2: Stress-Testing a Belief

1. User has a Claim node: "Meditation measurably reduces anxiety."
2. The Claim has four supporting references from wellness-oriented sources. No counterevidence.
3. The Engine surfaces an ambient suggestion: `Claim has no counterevidence. Search for opposing perspectives?`
4. User accepts. The Engine searches the entire library for passages that challenge or complicate the claim.
5. Two results appear in the Dock: a passage from a neuroscience paper noting methodological weaknesses in meditation studies, and a podcast excerpt where a researcher discusses the replication crisis in mindfulness research.
6. User assigns both to the Claim node's counterevidence section.
7. The conviction meter, previously at 90%, is manually adjusted to 68%.
8. User triggers synthesis on the Claim node. The Engine produces a paragraph that acknowledges the experiential evidence for meditation's effects while noting the empirical challenges to isolating causation. The synthesis does not take a side — it maps the terrain.

### Flow 3: Discovering Hidden Connections

1. User has been building a graph for several weeks across philosophy, psychology, and neuroscience.
2. User types in the Console: `find emerging patterns`.
3. The Engine scans the graph for clusters of excerpts that share semantic themes but are not connected by edges.
4. The Engine identifies a pattern: seven excerpts across four sources (Stoic philosophy, CBT research, Buddhist texts, and a neuroscience lecture) all address the idea that perception is a constructive process, not a passive reception.
5. The suggestion appears: `Emerging pattern: "Constructive Perception" — 7 excerpts across 4 sources. Create node?`
6. User accepts. A new Concept node is created and pre-populated with the seven excerpts. Edges are auto-generated from the relevant Source nodes.
7. User reviews the node, adjusts the title to "Perception as Construction," and triggers a synthesis that ties the philosophical, clinical, and neuroscientific perspectives together.

### Flow 4: Asking Your Library a Question

1. User is writing an essay and needs to recall a specific argument. They don't remember which book it came from.
2. User types in the Console: `what do my sources say about the relationship between language and thought?`
3. The Engine searches all imported sources and all node content for relevant passages.
4. The Console displays a structured answer: three excerpts from two different sources, each with the source name, location, and a brief contextual note explaining how the passage relates to the query.
5. User clicks on one of the excerpts. The corresponding node is highlighted on the canvas and the drawer expands to show the full context.

### Flow 5: Maintaining Graph Hygiene

1. User's graph has grown to 60+ nodes over several months.
2. User types in the Console: `audit graph`.
3. The Engine runs a structural analysis and returns a report in the Console:
   - 4 Claim nodes with no counterevidence.
   - 7 "extends" edges that have never been re-typed.
   - 12 orphaned excerpts in the Dock older than two weeks.
   - 3 Source nodes with partial ingestion (extraction was interrupted or incomplete).
   - 2 suggested merges: nodes with nearly identical titles and overlapping references.
4. Each item in the report is actionable — clicking on a Claim node navigates to it on the canvas, clicking on an orphaned excerpt opens the Dock with that item highlighted.
5. User works through the audit, re-typing vague edges, dismissing stale orphans, and completing the partial ingestions.

---

## Design Principles

**Grounded in your knowledge, not general knowledge.** The Engine's answers come from your imported sources and your graph, not from the internet or its training data. When it says "Seneca argues that suffering is imagined," it is quoting an excerpt you imported, not paraphrasing Wikipedia. This makes the Engine a tool for navigating *your* research, not a substitute for doing it. If the Engine cannot answer a question from your library, it says so — it does not fabricate an answer from general knowledge.

**Proactive but never autonomous.** The Engine suggests, but it never acts without consent. It will tell you that a Claim has no counterevidence, but it will not go find counterevidence and attach it on its own. It will suggest a new Concept node based on emerging patterns, but it will not create the node until you approve it. The graph is yours. The Engine advises.

**Visible reasoning.** When the Engine makes a suggestion or produces a synthesis, the underlying logic should be traceable. A connection suggestion should reference the excerpts that motivated it. A synthesis should be grounded in the specific references it drew from. An audit finding should link directly to the nodes in question. The Engine is not a black box — it shows its work.

**Proportional presence.** The Engine's visibility scales with the complexity of the task. For simple retrieval, it operates silently — results just appear in the Dock. For synthesis, it produces a paragraph that you can read and evaluate. For suggestions, it offers a one-line prompt that you can accept or dismiss. For interrogation, it provides a structured answer with citations. The Engine never says more than the task requires.
