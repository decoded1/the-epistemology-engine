# Node Variants

**Knowledge Graph Node System — UX Workflow Specification**

---

## Overview

Nodes are the atomic units of the Epistemology Engine. Every concept, claim, source, and sub-argument in your knowledge graph is represented as a node on the canvas. They are the things you see, select, connect, and expand.

The system defines four node types, each designed for a distinct epistemological function. A Concept node captures a mental model. A Branch node extends it with specificity. A Source node anchors the graph to real material. A Claim node stakes a position and tracks the evidence for and against it. Together, they give structure to the messy, nonlinear process of making sense of what you read, watch, and think about.

Every node shares the same physical shell — a 300px card with a header, an expandable drawer, ports, and a footer. The differences are in what the drawer contains and what the node represents in the topology of the graph.

---

## Shared Anatomy

All four node types inherit the same structural foundation.

### Header

The top region of every node. It contains three elements:

- **Type badge** — a small color-coded pill in the top-left that identifies the node variant. Each type has a unique color: blue for Concept, violet for Branch, emerald for Source, amber for Claim. The badge uses monospace uppercase text for visual distinction at small sizes.
- **Title** — the primary label of the node. 14px, semibold, high-contrast white. This is the most prominent text element and should be scannable from a distance on the canvas.
- **Description** — a secondary line of muted text below the title, clamped to two lines. This provides enough context to differentiate similarly named nodes without requiring expansion.

### Ports

Connection points positioned on all four edges of the node (top, bottom, left, right). Ports are small 8px circles that sit on the border, invisible at rest and interactive on hover.

**Default state** — the port renders as a subtle dot matching the node's border color. It is visually present but does not compete with the node content.

**Hover state** — the port scales up slightly, fills with blue, and emits a soft glow. The cursor changes to a crosshair, signaling that a drag will initiate an edge connection.

**Selected node state** — all four ports on a selected node tint to the selection accent color, making connection points more discoverable when you are actively working with a node.

Ports are bidirectional. Dragging from any port to any other port on a different node creates an edge. The direction of the edge (source → target) is determined by the order of interaction, not the port position.

### Footer

The bottom strip of the node, always visible regardless of expansion state. It contains:

- **Data density indicators** — small icon-and-number pairs that summarize the node's content at a glance. A document icon with a count shows how many references are attached. A sparkle icon indicates whether an AI synthesis has been generated. These disappear when the drawer is expanded since the full content is now visible.
- **Action hint** — a monospace label on the right side reading `expand` or `collapse`. This serves as both a status indicator and an affordance. The entire footer is a click target for toggling the drawer.

**Hover behavior** — the footer background lightens subtly and the action hint text brightens, confirming interactivity.

### The Drawer

The expandable interior of the node, hidden by default and revealed when the footer is clicked. The drawer uses a CSS grid animation (`grid-template-rows: 0fr → 1fr`) to expand smoothly without layout jumps.

When expanded, the drawer's children animate in with a staggered fade-up sequence, each element appearing 40ms after the previous one. This creates a sense of content materializing rather than snapping into view.

The drawer's contents vary by node type. This is where the four variants diverge.

---

## Node Types

### Concept Node

**Color:** Blue
**Purpose:** Represents a mental model, framework, or overarching idea.

The Concept node is the highest-level building block in the graph. It captures ideas like "Internal Locus of Control," "Cognitive Reappraisal," or "Augmented Intelligence" — abstractions that multiple sources, claims, and branches can connect to.

**Drawer contents:**

- **Literature references** — a list of excerpts drawn from epub and JSONL sources. Each reference displays the source name, a precise location (chapter, page, section), and the excerpt text rendered as an indented italic blockquote with a subtle left border. A delete button appears on hover for each reference.
- **Media references** — a list of references drawn from YouTube transcripts and other media. Each displays the source name, a timestamp, and a micro-timeline bar showing visually where in the media the reference occurs. The timeline is a thin 3px track with a filled blue segment representing the timestamp's position relative to the total duration.
- **Tags** — a row of small pills at the bottom of the drawer. Tags are user-assigned or AI-suggested labels that create cross-cutting connections across the graph (e.g., `#stoicism`, `#psychology`, `#cbt`). Tags are hoverable and will eventually be filterable from the Console.
- **AI Synthesis indicator** — the density footer shows a sparkle icon when a synthesis has been generated. The synthesis itself (a paragraph of AI-generated connective text) renders at the top of the drawer when present.

**Typical connections:** Concept nodes connect downward to Branch nodes, laterally to other Concept nodes, and receive incoming edges from Source nodes.

---

### Branch Node

**Color:** Violet
**Purpose:** Represents a subsection, sub-argument, or specific facet of a parent concept.

Branch nodes add granularity. Where a Concept node might be "Stoicism," its Branch nodes might be "Dichotomy of Control," "Negative Visualization," and "Amor Fati." They allow you to decompose large ideas into navigable sub-structures without overloading the parent node with references.

**Drawer contents:**

- **Literature references** — identical in structure to Concept nodes. Same source name, location, excerpt format.
- **Media references** — identical in structure to Concept nodes. Same micro-timeline pattern.
- **Tags** — same tag pill row.

The Branch node's drawer is intentionally identical to the Concept node's drawer in structure. The difference is semantic, not visual — a Branch exists to be a child of a Concept, not a peer. This is enforced by graph topology, not by the node's internal UI.

**Typical connections:** Branch nodes connect upward to a parent Concept node. They may also connect laterally to other Branch nodes or downward to Claim nodes.

---

### Source Node

**Color:** Emerald
**Purpose:** Represents a specific book, file, video, or other source material as a first-class entity in the graph.

Most knowledge tools treat sources as metadata — a footnote, a citation link, a property on a note. The Epistemology Engine treats sources as nodes. A Source node for "Meditations by Marcus Aurelius" sits on the canvas alongside the concepts it informs, with visible edges connecting it to every node that references it. This makes provenance spatial. You can see at a glance which ideas come from which books.

**Drawer contents:**

- **Metadata grid** — a 2×2 grid of key-value pairs showing structured information about the source:
  - **Format** — the file type (`.epub`, `.jsonl`, `.mp4`, etc.).
  - **Chapters / Segments** — the structural count of the source (12 chapters, 124 letters, 47 episodes).
  - **Excerpts** — the total number of excerpts that have been extracted from this source across the entire graph.
  - **Linked** — the number of nodes in the graph that reference this source.
- **Ingestion status** — a progress bar showing how much of the source has been indexed by the system. A fully indexed source shows a solid gradient bar (emerald to blue) with a "Fully indexed" label and file size. A partially indexed source shows a partial fill with a percentage and an estimated time remaining.

The Source node's drawer does not contain excerpts directly. Excerpts live on the Concept, Branch, and Claim nodes that reference them. The Source node is a map of the source's presence across the graph, not a container for its content.

**Typical connections:** Source nodes connect outward to every node that contains an excerpt from that source. These edges are typically auto-generated during the assignment flow — when you drag an excerpt from the Dock onto a Concept node, an edge from the source to that Concept is created automatically if one doesn't already exist.

---

### Claim Node

**Color:** Amber
**Purpose:** Represents a specific assertion, belief, or thesis that can be supported or contested by evidence.

The Claim node is what makes this an epistemology tool rather than a note-taking app. It represents not just an idea but a *position* — something you believe to be true (or are investigating) that has evidence on both sides. "Suffering is self-generated." "Free will is an illusion." "Spaced repetition is the most efficient learning method." These are claims.

**Drawer contents:**

- **Conviction meter** — a horizontal bar at the top of the drawer showing your current confidence level in the claim, expressed as a percentage. The bar fills in amber from left to right. The percentage label sits to the right of the track. This is a manually set value — you adjust it as you encounter new evidence. It is not calculated automatically.
- **Supporting evidence** — a list of references that argue *for* the claim. Structurally identical to the literature reference pattern: source name, location, excerpt text.
- **Counterevidence** — a list of references that argue *against* the claim. Same structure as supporting evidence, but positioned below it as a separate section. The visual separation between supporting and counterevidence is the core feature of the Claim node. It forces you to confront both sides of an argument in the same place.
- **Tags** — same tag pill row as other node types.

**Typical connections:** Claim nodes connect upward to the Concept or Branch node they belong to. They may receive "supports" or "contradicts" edges from other Claim nodes.

---

## Interactive States

Every node passes through four visual states. These states are consistent across all four node types.

### Default

The node at rest on the canvas. Border is a subtle `rgba(255,255,255,0.09)`, background is the surface color. Shadow is minimal. The node is visually present but recessive — it does not compete for attention with selected or hovered nodes.

### Hover

The cursor is over the node. The border brightens to `rgba(255,255,255,0.16)`, the node lifts 1px (translateY), and the shadow deepens. Ports remain in their default state unless individually hovered. The footer action hint text brightens.

### Selected

The node has been clicked. The border shifts to the selection accent color (blue at 25% opacity), and a soft ambient glow radiates from the node edges. All four ports tint to the selection color. The node appears in the Console's context strip as a chip, enabling contextual commands.

A selected node does not automatically expand. Selection and expansion are independent states — you can select a node to issue Console commands against it without opening its drawer.

### Expanded

The drawer is open. The node's height grows smoothly to accommodate the drawer content. The footer action hint changes to `collapse`. The data density indicators in the footer disappear since the full content is now visible.

Expanded state combines with Selected state — a node can be both selected (blue border glow) and expanded (drawer open) simultaneously. This is the most common working state when you are actively editing a node's references or reviewing its content.

---

## Edge Types

Edges are the lines connecting nodes on the canvas. They carry semantic meaning through typed labels that describe the nature of the relationship between two nodes. The edge type is selected in the Console's footer when two nodes are selected simultaneously.

### Supports

**Color:** Emerald
**Meaning:** The source node provides evidence or reasoning that strengthens the target node.

This is the most common edge type. When an excerpt from Seneca supports a Concept node about resilience, the edge between the Source node and the Concept node is typed as "supports."

### Contradicts

**Color:** Red
**Meaning:** The source node provides evidence or reasoning that weakens or opposes the target node.

This edge type is critical for the Claim node workflow. When counterevidence from one source challenges a claim, the "contradicts" edge makes the tension visible in the graph topology — you can see at a glance which claims are contested and where the disagreements originate.

### Refines

**Color:** Violet
**Meaning:** The source node adds nuance, specificity, or precision to the target node without directly supporting or opposing it.

A Branch node often "refines" its parent Concept node. A Claim node might "refine" another Claim node by narrowing its scope. This edge type captures the relationship of elaboration rather than agreement or disagreement.

### Prerequisite

**Color:** Blue
**Meaning:** The source node must be understood before the target node is meaningful.

This edge type establishes a learning order. If "Bayesian Reasoning" is a prerequisite for "Bayesian Epistemology," the edge encodes that dependency. This becomes valuable when the graph is used not just for personal sense-making but for sharing structured knowledge with others.

### Extends

**Color:** Neutral
**Meaning:** The source node builds upon the target node in a general, unspecified way.

A catch-all for relationships that don't fit the other four types. Useful during early graph construction when you know two nodes are related but haven't yet determined the precise nature of the connection. Extends edges can be re-typed later as your understanding of the relationship matures.

---

## Interaction Flows

### Flow 1: Building a Concept Tree

1. User creates a Concept node via the Console: `> create concept: Stoicism`.
2. A new Concept node appears on the canvas with a blue badge, the title "Stoicism," and an empty drawer.
3. User creates three Branch nodes: `> create branch: Dichotomy of Control`, `> create branch: Negative Visualization`, `> create branch: Amor Fati`.
4. User selects the Stoicism Concept node, then shift-clicks each Branch node. The Console enters edge mode, showing both nodes as chips with an arrow between them.
5. User selects "refines" as the edge type and confirms. Three edges now connect the Branch nodes to the parent Concept.
6. The canvas auto-layouts to position the Branch nodes below the Concept node in a tree structure.

### Flow 2: Attaching Evidence to a Claim

1. User has a Claim node: "Suffering is self-generated."
2. User opens the Dock, which contains recently imported excerpts from Seneca and Epictetus.
3. User drags an excerpt from Seneca ("We suffer more often in imagination than in reality") onto the Claim node.
4. The excerpt appears in the Claim node's **Supporting evidence** section. An edge from the Seneca Source node to the Claim node is auto-created with a "supports" type.
5. User finds a counterpoint from Gabor Maté in the Dock and drags it onto the same Claim node.
6. Because the excerpt argues against the claim, the user manually moves it to the **Counterevidence** section (or the AI suggests the placement based on semantic analysis).
7. User adjusts the conviction meter from 85% to 72%, reflecting the new counterevidence.

### Flow 3: Expanding and Reviewing a Node

1. User clicks a Concept node on the canvas. It enters the Selected state (blue glow, appears in Console context strip).
2. User clicks the footer or presses `Space` to expand the drawer.
3. The drawer animates open, revealing literature references, media references, and tags with a staggered fade-in.
4. User reviews the references. One excerpt is outdated — user hovers over it and clicks the delete button to remove it.
5. User wants to add a new excerpt. Without closing the drawer, they type in the Console: `find excerpts on "internal locus" in @meditations.epub`.
6. Results arrive in the Dock. User assigns one to the currently selected node via the quick-assign button.
7. The new reference appears in the node's drawer immediately.

### Flow 4: AI Synthesis on a Concept Node

1. User selects a Concept node that has accumulated several references across literature and media.
2. User types in the Console: `synthesize` (or clicks the synthesis indicator in the node's density footer).
3. The AI reads all attached excerpts and generates a connective paragraph that identifies the common thread across the references.
4. The synthesis appears at the top of the node's expanded drawer. The density footer's sparkle icon illuminates to indicate synthesis is present.
5. The synthesis is editable — user can refine it manually or regenerate it with a different prompt.

### Flow 5: Discovering Contradictions Across the Graph

1. User has built a graph with multiple Claim nodes connected to Concept nodes.
2. User types in the Console: `find contradictions`.
3. The AI scans the graph for Claim nodes with counterevidence or for edges typed as "contradicts."
4. Results highlight the relevant nodes and edges on the canvas. Contradicted claims pulse briefly with a red border to draw attention.
5. User clicks into each highlighted Claim node to review the supporting and counterevidence side by side.

---

## Design Principles

**Type is semantic, not decorative.** The four node types exist because they represent genuinely different epistemological objects, not because the UI needs visual variety. A Concept is not a Claim. A Source is not a Branch. The type badge, drawer contents, and connection patterns all reinforce this distinction.

**Expansion is optional, not required.** The collapsed state of a node should communicate enough information (title, description, density counts) to be useful in the context of the graph. Expansion is for deep work on a specific node, not for basic navigation. A well-designed graph should be readable without expanding anything.

**Edges carry meaning.** Untyped connections are intellectual debt. Every edge in the graph should eventually have a type — supports, contradicts, refines, prerequisite, or extends. The "extends" type exists as a temporary holding state, not as a permanent category. The system should gently encourage re-typing vague edges as understanding matures.

**Evidence is bilateral.** The Claim node's split between supporting evidence and counterevidence is the single most important design decision in the node system. It encodes the principle that knowledge is not about collecting confirmations — it is about holding opposing evidence in tension and tracking where your confidence actually stands. The conviction meter makes this quantitative. The counterevidence section makes it structural.
