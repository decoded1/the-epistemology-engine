# The Dock

**Unsorted Excerpt Tray — UX Workflow Specification**

---

## Overview

The Dock is the ingestion landing zone for the Epistemology Engine. It is a retractable tray anchored to the bottom-left of the canvas that holds excerpts waiting to be assigned to nodes in the knowledge graph. Every piece of content that enters the system — whether extracted from an epub, pulled from a JSONL file, or transcribed from a YouTube video — passes through the Dock before it becomes part of the graph.

The Dock replaces the traditional left sidebar. It claims zero permanent screen real estate, appearing only when needed and collapsing to a single pill indicator when dismissed. This is a deliberate architectural choice: in a node-based spatial interface, every pixel belongs to the canvas.

---

## Anatomy

The Dock has three physical forms depending on its state:

### The Indicator (Collapsed)

A small pill anchored to the bottom-left corner, 16px from the edge, sitting just above the Console. It displays:

- **Count ring** — a circular badge showing the number of unsorted excerpts. Styled in amber when items are present, neutral when empty.
- **Label** — the word "unsorted" in muted text.
- **Shortcut hint** — a small keyboard badge showing `D` as the toggle key.

The indicator's entire purpose is passive awareness. It tells you "there are 7 things waiting" without demanding attention or claiming layout space. Clicking it opens the tray.

### The Tray (Expanded)

A 360px-wide floating panel that slides up from the indicator position. It contains:

- **Header** — the title "Dock" alongside a live count badge (e.g., "7 unsorted") and a close button.
- **Filter tabs** — three filters: `All`, `Literature`, `Media`. These filter the excerpt list by source type without changing the underlying data.
- **Excerpt list** — a scrollable list of excerpt cards, each representing one unsorted piece of content.
- **Footer** — contextual hints for interaction (drag-to-assign, keyboard shortcuts) and a "Clear all" action for bulk dismissal.

The tray overlays the canvas temporarily. It does not push content or resize the graph. When closed, everything returns to the indicator state.

### The Drag Ghost (During Assignment)

When an excerpt is dragged from the Dock toward the canvas, a translucent preview card follows the cursor showing a truncated version of the excerpt text. Simultaneously, valid drop-target nodes on the canvas illuminate with a dashed blue border glow, signaling where the excerpt can be assigned.

---

## The Excerpt Card

Each card in the Dock represents a single unsorted excerpt. Cards are designed for rapid scanning — you should be able to identify the source, content, and status of an excerpt in under two seconds.

### Card Anatomy

**Source row** — sits at the top of the card. Displays a format-coded icon and the source name.

- Epub sources show a blue icon with a `B` glyph.
- JSONL sources show a green icon with a `{ }` glyph.
- YouTube/media sources show a red icon with a `▶` glyph.

The source name is displayed in monospace, truncated with ellipsis if it exceeds the available width.

**Status badge** — a small tag in the top-right corner indicating the excerpt's state:

- `ORPHAN` — the excerpt has been in the Dock and has no node assignment. Neutral styling.
- `NEW` — the excerpt just arrived from a recent import or ingestion. Amber styling to draw attention.

**Excerpt text** — the body of the card. Displays up to three lines of the excerpt content, clamped with overflow. Italic styling distinguishes quoted content from interface text.

**Meta row** — sits at the bottom. Contains two elements:

- **Tags** — small pills showing any auto-generated or user-assigned tags (e.g., `#stoicism`, `#neuroscience`).
- **Location reference** — a precise pointer back to the source material. For literature, this is a chapter and page or verse reference (e.g., `Book II · §4`, `Proverbs 23:7`). For media, this is a timestamp (e.g., `01:47:32`).

### Card Interactions

**Hover** — reveals two action buttons in the top-right corner:

- **Assign (+)** — opens a quick-assign flow to attach the excerpt to an existing node without dragging. This could trigger a small dropdown of recent/relevant nodes, or it could work in tandem with the Console (select a node on the canvas, then click assign).
- **Dismiss (×)** — removes the excerpt from the Dock. This does not delete the excerpt from the system — it simply marks it as reviewed and not needed for the current graph. Dismissed excerpts can be recovered from the source file at any time.

**Click** — selects the card, highlighting it with a blue glow border. A selected card can be assigned to a node via the Console ("assign selected to [node name]") or via keyboard shortcut.

**Drag** — initiates the drag-to-assign flow. The card goes translucent, the drag ghost appears on the canvas, and valid target nodes illuminate.

---

## Interaction Flows

### Flow 1: Triage After Import

1. User imports `meditations.epub` via the Console (`> import @meditations.epub`).
2. The ingestion toast appears at the bottom-center: a spinner, the filename, and a live count of excerpts being extracted (e.g., "34 / 51 excerpts").
3. As excerpts are extracted, they populate the Dock. The indicator count increments in real time. The count ring pulses with amber glow to signal new arrivals.
4. User opens the Dock with `D` or by clicking the indicator.
5. User scans the excerpt list, dragging relevant excerpts onto concept nodes on the canvas and dismissing irrelevant ones.
6. When finished, user closes the Dock with `Escape` or `D`. The remaining unsorted count persists on the indicator.

### Flow 2: Targeted Extraction via Console

1. User selects a concept node on the canvas ("Internal Locus of Control").
2. User opens the Console and types: `find excerpts on "personal agency" in @letters_from_a_stoic.epub`
3. The AI searches the source file and returns matching excerpts. These land in the Dock with `NEW` status badges.
4. User opens the Dock, reviews the results, and assigns relevant ones to the selected node.

### Flow 3: Quick Assign Without Dragging

1. User clicks a node on the canvas to select it (it appears as a chip in the Console's context strip).
2. User opens the Dock.
3. User hovers over an excerpt and clicks the Assign (+) button.
4. The excerpt is attached to the currently selected node. The card animates out of the Dock list, and the node's reference count increments.

### Flow 4: Filtering by Source Type

1. User imports several sources: two epubs, one JSONL file, and a YouTube transcript.
2. The Dock accumulates excerpts from all sources.
3. User clicks the `Media` filter tab to isolate YouTube transcript excerpts and review them separately.
4. User switches to `Literature` to focus on epub and JSONL content.
5. The `All` tab restores the full list.

---

## States

| State | Indicator | Tray | Behavior |
|---|---|---|---|
| **Empty** | Hidden entirely | N/A | No unsorted excerpts exist. The Dock does not render. |
| **Collapsed** | Visible with count | Hidden | Default resting state. Passive awareness only. |
| **Pulsing** | Visible with animated amber glow | Hidden | New excerpts have arrived. Pulse continues for a few cycles then stops. |
| **Open** | Hidden (replaced by tray) | Visible | User is actively browsing and triaging excerpts. |
| **Dragging** | Hidden | Visible (card goes translucent) | An excerpt is being dragged toward the canvas. Target nodes glow. |
| **Ingesting** | Visible and pulsing | May be open or closed | A file is being processed. The ingestion toast shows progress. Count increments live. |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `D` | Toggle the Dock open/closed |
| `Escape` | Close the Dock (if open) |
| `↑` / `↓` | Navigate between excerpt cards when the Dock is open |
| `Enter` | Assign the selected excerpt to the currently active node |
| `Backspace` | Dismiss the selected excerpt |

---

## Design Principles

**No permanent footprint.** The Dock never claims persistent layout space. It overlays when open and vanishes when closed. The canvas is sacred.

**Passive over active.** The indicator communicates state (count, pulse) without demanding interaction. You can ignore the Dock entirely and it will never interrupt your work on the graph.

**Source-aware, not source-organized.** Excerpts in the Dock are a flat list, not grouped by source file. The format icon and source name on each card provide provenance, and the filter tabs allow temporary grouping, but the default view is chronological. This prevents the Dock from becoming a file browser.

**Transient by design.** The Dock is a staging area, not a storage system. Excerpts should flow through it — arrive, get triaged, and either join the graph or get dismissed. A Dock with 200 items in it is a Dock that isn't being used correctly, and the interface should subtly encourage regular triage through the count indicator and pulse behavior.
