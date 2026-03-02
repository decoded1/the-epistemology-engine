# The Epistemology Engine

**A Spatial Knowledge Environment for Documenting What You Know and Why You Believe It**

---

## What This Is

The Epistemology Engine is a personal knowledge tool built for people who read seriously, watch critically, and want to organize the ideas they encounter into something they can navigate, challenge, and share.

It is a graph-based research environment where the things you learn become nodes on a canvas, the relationships between those ideas become edges with meaning, and an AI layer helps you search, connect, and pressure-test your understanding across everything you have ever imported into the system.

You import your books, your articles, your transcripts. The system indexes them, extracts the passages that matter, and gives you a spatial canvas where you arrange those ideas into a structure that reflects how you actually think about them — not how a file system would organize them, not how a library would catalog them, but how the concepts relate to each other in your mind.

Then the AI helps you find what you forgot you read, notice connections you missed, and confront the places where your beliefs are under-supported or contradicted by your own sources.

---

## The Problem It Solves

People who care about knowledge — who read widely, take notes compulsively, and think carefully about what they believe — face a specific and underserved problem. The volume of material they consume outpaces their ability to organize it. The notes they take decay in isolation. The connections between ideas from different sources exist only in their memory, which is unreliable and impermanent.

The tools that exist today solve adjacent problems but not this one.

**Note-taking apps** (Notion, Obsidian, Roam) are built around documents and backlinks. They are good at capturing text and creating webs of references, but they treat every note as equal. A quote from Marcus Aurelius and a grocery list occupy the same structural tier. There is no distinction between a concept and a claim, no way to track evidence for and against a belief, no spatial view of how ideas relate at scale.

**Read-later and annotation tools** (Readwise, Kindle highlights, Hypothes.is) are good at extracting passages from sources, but the excerpts land in flat lists organized by book. The connection between a highlight in Seneca and a highlight in a neuroscience paper exists only if you remember both and manually link them. The tool does not help you see that connection.

**Mind mapping tools** (Miro, MindMeister, XMind) offer spatial canvases, but they are drawing tools, not knowledge tools. Nodes are text labels with no internal structure. There is no concept of a source, no excerpt management, no AI that understands what the nodes contain.

**AI chatbots** (ChatGPT, Claude, Gemini) can answer questions about general knowledge, but they do not know what you have read. They cannot search your personal library. They cannot tell you which of your own sources supports or contradicts a specific belief. They operate on the internet's knowledge, not yours.

The Epistemology Engine sits at the intersection of all four. It is a spatial canvas with structured nodes that hold real excerpts from real sources, connected by typed edges that carry semantic meaning, powered by an AI that operates exclusively on your imported material. It is not a note-taking app. It is not a mind map. It is not a chatbot. It is a research environment for building, navigating, and interrogating a personal knowledge graph.

---

## Who It Is For

The Epistemology Engine is for anyone who treats knowledge as something to be structured rather than merely accumulated. Specifically:

**Independent researchers** who read across disciplines and need to track how ideas from philosophy, psychology, neuroscience, theology, and other fields connect to each other. These people often have hundreds of highlights scattered across dozens of books with no system for seeing the relationships between them.

**Autodidacts and lifelong learners** who consume books, podcasts, lectures, and articles as a primary mode of intellectual engagement. They want more than a reading log — they want a living map of what they have learned and how it fits together.

**Writers and content creators** who build arguments, essays, or educational material from researched sources. The Engine gives them a way to collect evidence, identify the structure of an argument, and trace every claim back to a specific passage in a specific source.

**Students of theology, philosophy, or any text-heavy discipline** who need to track interpretations, cross-references, and competing arguments across canonical texts. A JSONL file of Bible verses, an epub of Augustine's Confessions, and a YouTube lecture on hermeneutics can all coexist in the same graph, connected by the ideas they share.

**Anyone who has ever thought:** "I read something about this in a book two years ago but I cannot remember which one, and my notes are useless." The Engine exists to make that moment impossible.

---

## How It Works

The system is composed of five modules that work together as a unified environment.

### The Canvas

The canvas is the primary workspace — a full-bleed, infinite spatial surface where your knowledge graph lives. Nodes float on the canvas. Edges connect them. You pan, zoom, drag, and arrange freely.

There are no sidebars, no file trees, no persistent panels claiming screen real estate. The canvas is everything. Every other module floats on top of it temporarily and disappears when dismissed. This is a deliberate commitment to spatial thinking — the graph is not a feature of the app, it is the app.

The canvas renders a dot grid background for spatial orientation and supports standard graph interactions: click to select, drag to move, shift-click to multi-select, scroll to zoom, and drag from ports to create edges.

### The Console

The Console is a floating command panel anchored to the bottom center of the canvas, 10 pixels above the viewport edge. It is the single surface through which you command the system — creating nodes, querying your library, triggering AI actions, and navigating the graph.

The Console adapts its behavior based on context. With nothing selected, it is a general command bar. With one node selected, it becomes contextual to that node. With two nodes selected, it enters edge synthesis mode. The `@mention` system lets you scope queries to specific source files in your library.

The Console replaces the traditional command palette, the search bar, the AI chat input, and the toolbar. One surface, context-aware, always accessible.

### The Nodes

Nodes are the atomic units of the knowledge graph. Every idea, source, and claim is represented as a node on the canvas. The system defines four types:

**Concept nodes** capture mental models and overarching ideas. They hold literature and media references, AI-generated synthesis, and tags. They are the top-level organizational unit of the graph.

**Branch nodes** add granularity to concepts. They represent sub-arguments, specific facets, and supporting ideas that extend a parent concept without overloading it.

**Source nodes** represent your imported material as first-class entities in the graph. A book, a JSONL file, or a YouTube video gets its own node with metadata, ingestion status, and visible edges connecting it to every node that references it. This makes provenance spatial — you can see which ideas come from which sources at a glance.

**Claim nodes** represent specific assertions or beliefs with evidence on both sides. They feature a conviction meter (a percentage reflecting your confidence), a supporting evidence section, and a counterevidence section. The structural separation of evidence for and against a claim is the defining feature of the system. It encodes the principle that knowledge is not about collecting confirmations — it is about tracking where the evidence actually points.

All nodes share a common shell: a header with a type badge, title, and description; an expandable drawer containing the node's internal content; ports on all four edges for creating connections; and a footer with density indicators and an expand/collapse toggle.

### The Dock

The Dock is a retractable tray anchored to the bottom-left of the canvas. It holds excerpts that have entered the system but have not yet been assigned to a node — the ingestion landing zone.

When you import a source file, the AI extracts meaningful passages and deposits them in the Dock as individual excerpt cards. Each card shows its source, content, auto-generated tags, and a precise location reference. From the Dock, you triage: drag excerpts onto nodes, use the quick-assign button, or dismiss excerpts you do not need.

The Dock collapses to a small pill indicator showing the count of unsorted items. It claims no permanent screen space. When new excerpts arrive from an import, the indicator pulses with amber glow to signal that material is waiting. The Dock is a staging area, not a storage system — excerpts should flow through it and into the graph.

### The Engine

The Engine is the AI integration layer. It has no dedicated interface — it operates through the Console, the Dock, and the node drawers. Its capabilities span five domains:

**Retrieval** — searches your imported sources to find passages matching a query. Scoped retrieval targets a specific file. Unscoped retrieval searches your entire library. Node-contextual retrieval uses a selected node's content as additional search context.

**Synthesis** — reads the references attached to a node and generates connective reasoning that identifies patterns, tensions, and through-lines. On Claim nodes, synthesis weighs both supporting and counterevidence.

**Extraction** — processes imported source files (epub, JSONL, YouTube transcripts) and produces discrete, tagged excerpts with location metadata.

**Suggestion** — proactively identifies missing connections, under-supported claims, emerging concept patterns, and stale orphaned excerpts. Suggestions are ambient and non-interruptive.

**Interrogation** — answers natural language questions about your graph and library. Factual queries, structural queries, comparative queries, and gap analysis — all grounded exclusively in your imported material, never in general knowledge.

---

## What Makes It Different

### Your knowledge, not the internet's

Every answer the Engine produces is grounded in material you have imported. It searches your books, your transcripts, your files. It does not supplement with general knowledge. If you ask a question and your library does not contain the answer, the Engine tells you so. This constraint is the point. The system reflects what you have actually encountered and engaged with, not what an AI model was trained on.

### Spatial, not hierarchical

Ideas do not organize neatly into folders. The relationship between Stoic philosophy, cognitive behavioral therapy, and neuroscience research on emotion regulation is not a file tree — it is a web. The canvas lets you arrange ideas spatially, with typed edges that make the nature of each connection explicit. You can see at a glance that three different sources all support the same claim, or that two concepts in different domains share a "refines" relationship.

### Evidence is bilateral

The Claim node's split between supporting evidence and counterevidence is not a feature — it is a worldview encoded in the interface. Most note-taking tools assume you are collecting information. The Epistemology Engine assumes you are testing beliefs. The conviction meter asks you to put a number on your confidence. The counterevidence section asks you to confront what challenges your position. The Engine will even search your library for passages that might disagree with a claim if you ask it to. This is software for people who want to be rigorous, not just organized.

### Sources are first-class objects

In most tools, a book is a property on a note — a citation, a tag, a metadata field. In the Epistemology Engine, a book is a node. It sits on the canvas alongside the concepts it informs, with visible edges connecting it to every idea it contributed to. You can click on a Source node and see its metadata, how many excerpts have been extracted, how many nodes reference it, and whether it has been fully indexed. Provenance is not hidden in footnotes — it is part of the graph topology.

### No permanent chrome

The canvas has no sidebar, no toolbar, no navigation panel, no persistent UI elements claiming screen space. The Console floats at the bottom. The Dock collapses to a pill. Node details live inside the nodes themselves. Everything appears when needed and disappears when dismissed. In a spatial interface, every pixel matters. The Epistemology Engine gives all of them to the graph.

---

## The Workflow in Practice

A typical session with the Epistemology Engine looks like this:

You sit down with a book you just finished reading. You import the epub through the Console. The Engine spends a minute extracting passages — you watch the progress toast tick upward as excerpts land in the Dock. When it finishes, you have forty-seven excerpts waiting to be placed.

You open the Dock and start scanning. Some excerpts are immediately relevant to nodes already on your canvas — you drag them over, and they snap into place as references in the node drawers. Some excerpts suggest a new idea you had not explicitly captured yet — you create a new Concept node from the Console and assign the excerpts to it. Some excerpts do not fit anywhere right now — you leave them in the Dock for later, or dismiss them.

Halfway through the triage, you notice that three excerpts from this new book are making the same point as two excerpts from a book you imported six months ago. You type into the Console: `find emerging patterns`. The Engine identifies the cluster and suggests a new Concept node to capture the shared theme. You accept, name the node, and the Engine connects it to the relevant Source nodes automatically.

You select the new Concept node and ask the Engine to synthesize it. The synthesis paragraph draws a line between the five excerpts from two different authors, noting that they agree on the core principle but diverge on the mechanism. You read the synthesis, adjust it slightly, and move on.

Later, you revisit a Claim node that has been sitting in your graph for weeks. It has strong supporting evidence but nothing in the counterevidence section. You ask the Engine to search your library for opposing perspectives. It finds two passages — one from a source you forgot you imported, and one from a chapter you had not reached when you first created the claim. You add both to the counterevidence section and adjust the conviction meter from 88% down to 71%.

Before closing the session, you type `audit graph` into the Console. The Engine tells you that you have six "extends" edges that should be re-typed, nine orphaned excerpts older than two weeks in the Dock, and one Source node whose ingestion was interrupted and is only partially indexed. You spend five minutes cleaning up: re-typing the vague edges, dismissing the stale orphans, and re-running the incomplete extraction.

When you are done, your graph has grown by one Source node, twelve excerpts assigned to six nodes, two new Concept nodes, one updated Claim with fresh counterevidence, and a cleaner topology than when you started. The canvas reflects not just what you have read but what you think about what you have read — and where your thinking still has gaps.

---

## What It Is Not

The Epistemology Engine is not a note-taking app. You do not write long-form notes in it. You import source material, extract the parts that matter, and arrange them spatially.

It is not a reading app. You do not read books inside it. You read elsewhere, import the file when finished, and let the Engine extract the meaningful passages.

It is not a chat interface. The Engine does not have conversations. It retrieves, synthesizes, suggests, and answers — always in the context of your graph, never as open-ended dialogue.

It is not a publishing platform. The graph is your private research environment. Sharing and export are future considerations, not the core function.

It is a tool for one specific activity: taking the raw material of what you have read and watched, structuring it into a graph of concepts, claims, and evidence, and using AI to help you see what is there — including what is missing.

---

## The Name

Epistemology is the branch of philosophy concerned with the nature of knowledge — what it means to know something, how beliefs are justified, and what distinguishes warranted confidence from mere opinion.

The name is intentional. This is not a tool for collecting information. It is a tool for examining what you believe, tracing those beliefs to their sources, weighing the evidence on both sides, and being honest about how strong that evidence actually is.

The Engine is the system that helps you do it.
