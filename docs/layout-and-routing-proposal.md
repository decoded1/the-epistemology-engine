# Layout & Edge Routing Proposal

## Current Problems

1. **No real layout** — The scaffold uses a custom radial BFS algorithm. Nodes are placed in
   concentric rings with a 15° per-ring rotation to reduce stacking, but the result is geometric,
   not topological. The structure of the graph (which node has 5 children, which is a leaf, which
   has bidirectional loops) has no influence on where nodes end up.

2. **Wires always enter from the wrong side** — Edges are created without `sourceHandle` or
   `targetHandle`. ReactFlow defaults to the node's edge center, ignoring the 4 directional
   handles (`top`, `right`, `bottom`, `left`) that are already defined on every node. A wire
   between two horizontally adjacent nodes still enters from the top/bottom instead of from the
   facing sides. When you drag a node, the wire doesn't adapt — it keeps the stale entry point.

3. **Multiple scaffolds pile up** — The placement offset fix helps, but the offset is dumb
   (always `maxX + 900`). It doesn't account for the height of the new web, the shape of the
   existing graph, or available negative-X space.

---

## Part 1 — Dagre Auto-Layout

### What Dagre Is

`@dagrejs/dagre` is a directed graph layout engine. It takes a node/edge graph, runs a layered
Sugiyama algorithm, and returns (x, y) coordinates for every node. It is the standard pairing
for ReactFlow — lightweight, runs in browser and Node.js, and produces readable hierarchical
layouts. No server needed.

### How It Works

```
1. Build a dagre graph object from your nodes + edges
2. Set node dimensions (width: 300, height: ~120) and graph direction
3. Call dagre.layout(g)
4. Read g.node(id).x and g.node(id).y back out for each node
```

The algorithm respects edge direction: nodes that are "sources" (many things point away from
them) float to the left in LR mode, or to the top in TB mode. Leaf nodes (many things point
toward them) settle to the right or bottom. The concept root naturally ends up first.

### Direction Options

| Mode | Best For |
|------|----------|
| `LR` (left → right) | Causal chains, argument flows, prerequisite trees |
| `TB` (top → bottom) | Hierarchical breakdowns, concept → subconcept trees |

`LR` is the recommended default for this app — knowledge builds left to right.

### When It Runs

| Trigger | Behavior |
|---------|----------|
| `scaffold:` command | Replace radial BFS with dagre immediately after AI returns nodes/edges |
| `layout` console command | Re-layout the entire current graph on demand |
| Manual node drag | **Does NOT re-run** — user-dragged positions are preserved |

The `layout` console command gives the user explicit control without auto-fighting their
manual arrangement.

### Layout Function (Concept)

```ts
import Dagre from '@dagrejs/dagre';

function applyDagreLayout(
  nodes: AppNode[],
  edges: AppEdge[],
  direction: 'LR' | 'TB' = 'LR',
  center: { x: number; y: number }
): AppNode[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 220, nodesep: 100, marginx: 40, marginy: 40 });

  nodes.forEach(n => g.setNode(n.id, { width: 300, height: 120 }));
  edges.forEach(e => g.setEdge(e.source, e.target));

  Dagre.layout(g);

  // Compute bounding box center so we can re-center the layout on `center`
  const xs = nodes.map(n => g.node(n.id).x);
  const ys = nodes.map(n => g.node(n.id).y);
  const layoutCx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const layoutCy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const dx = center.x - layoutCx;
  const dy = center.y - layoutCy;

  return nodes.map(n => ({
    ...n,
    position: {
      x: g.node(n.id).x - 150 + dx,   // 150 = half node width
      y: g.node(n.id).y - 60 + dy,    // 60  = half node height estimate
    }
  }));
}
```

### Files Touched

| File | Change |
|------|--------|
| `package.json` | Add `@dagrejs/dagre` dependency |
| `src/services/aiEngine.ts` | Remove scaffold result from concern — layout stays in App.tsx |
| `src/App.tsx` | Replace BFS radial logic in `handleScaffold` with `applyDagreLayout` |
| `src/App.tsx` | Add `layout` command intercept in `handleCommand` that calls `applyDagreLayout` on full graph |
| `scripts/cli.ts` | Replace BFS radial logic in scaffold handler with dagre layout |

---

## Part 2 — Smart Edge Handles (Dynamic Port Selection)

### Current State

Every node already has 4 directional handles registered in its component:

```tsx
<Handle type="source" position={Position.Top}    id="top"    />
<Handle type="source" position={Position.Right}   id="right"  />
<Handle type="source" position={Position.Bottom"} id="bottom" />
<Handle type="source" position={Position.Left}    id="left"   />
```

But edges created by the scaffold don't specify `sourceHandle` or `targetHandle`. ReactFlow
falls back to the node edge center and passes a guessed `sourcePosition`/`targetPosition` into
the `SemanticEdge` renderer. The renderer just takes those values and draws a bezier — it never
looks at which side would be geometrically shorter.

When you drag a node, the edge's stored `sourceHandle`/`targetHandle` doesn't change, so the
wire keeps entering from the wrong side.

### The Proposal: Angle-Based Handle Override in SemanticEdge

Instead of relying on stored handles, the `SemanticEdge` component reads the **live positions**
of both connected nodes from the ReactFlow internal store and computes the best handles
at render time. This is reactive — every time a node moves, the edge re-renders and
self-corrects.

**The math:**

```
sourceCenterX = sourceNode.position.x + 150   (half of 300px width)
sourceCenterY = sourceNode.position.y + 60    (half of ~120px height)
targetCenterX = targetNode.position.x + 150
targetCenterY = targetNode.position.y + 60

angle = atan2(targetCenterY - sourceCenterY, targetCenterX - sourceCenterX)
```

Then map the angle to handle pairs:

```
angle in [-45°, +45°]    →  source RIGHT   →  target LEFT
angle in [+45°, +135°]   →  source BOTTOM  →  target TOP
angle in [+135°, +180°]  →  source LEFT    →  target RIGHT
angle in [-180°, -135°]  →  source LEFT    →  target RIGHT
angle in [-135°, -45°]   →  source TOP     →  target BOTTOM
```

```ts
function getBestHandles(angle: number): {
  sourcePos: Position;
  targetPos: Position;
  sourceHandleX: number;   // offset from node top-left
  sourceHandleY: number;
  targetHandleX: number;
  targetHandleY: number;
} {
  const a = ((angle * 180) / Math.PI + 360) % 360; // normalize to 0-360

  if (a >= 315 || a < 45)   return { source: RIGHT,  target: LEFT   };
  if (a >= 45  && a < 135)  return { source: BOTTOM, target: TOP    };
  if (a >= 135 && a < 225)  return { source: LEFT,   target: RIGHT  };
                             return { source: TOP,    target: BOTTOM };
}
```

The SemanticEdge then uses these to compute exact pixel positions of the chosen handles and
passes them directly to `getBezierPath` — bypassing whatever `sourceX/Y` ReactFlow inferred
from the stored handle data.

### Handle Pixel Positions (Per Side)

Given a node at position `(nx, ny)`, width `300`, height `h` (variable per node):

| Handle | X | Y |
|--------|---|---|
| `top`    | `nx + 150` | `ny + 0`   |
| `right`  | `nx + 300` | `ny + h/2` |
| `bottom` | `nx + 150` | `ny + h`   |
| `left`   | `nx + 0`   | `ny + h/2` |

Node height is the one unknown — it's a rendered DOM height, not stored in the DB. Pragmatic
options:
- **Fixed estimate** (120px) — simple, works for collapsed nodes, slightly off for expanded
- **Store rendered height in node data** via a `useEffect` + `ResizeObserver` in each node
  component, then read it in the edge renderer

The ResizeObserver approach is the correct long-term solution. The fixed estimate is fine for
the first implementation.

### What About User-Drawn Connections?

When a user manually drags from a specific handle, ReactFlow fires `onConnect` with
`sourceHandle: "right"` and `targetHandle: "left"`. These get stored on the edge.

For user-drawn edges, the smart override should **respect the user's chosen handles** — only
fall back to the angle calculation when `sourceHandle` is `null` or `undefined`. This keeps
manual connections intact while making scaffold-generated edges self-routing.

### Files Touched

| File | Change |
|------|--------|
| `src/components/edges/SemanticEdge.tsx` | Override `sourceX/Y` and `targetX/Y` using angle calculation; read live node positions from ReactFlow's `useStore` |
| `src/store/useGraphStore.ts` | No changes needed — node positions are already live in Zustand |

---

## Part 3 — Node Height Awareness (Optional, Phase 2)

The edge routing uses a fixed height estimate (120px). For expanded nodes with many references
this becomes inaccurate — the "bottom" handle appears to float in the middle of the node.

**Solution:** In each node component, add a `ResizeObserver`:

```tsx
const nodeRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (!nodeRef.current) return;
  const ro = new ResizeObserver(entries => {
    const h = entries[0].contentRect.height;
    updateNodeData(id, { _height: h });
  });
  ro.observe(nodeRef.current);
  return () => ro.disconnect();
}, []);
```

Then `SemanticEdge` reads `sourceNode.data._height` instead of using 120. This is Phase 2
because it requires touching all 4 node components and adds a live height field to every
node's data.

---

## Implementation Order

```
1. Install @dagrejs/dagre
2. Build applyDagreLayout() utility in src/lib/layout.ts
3. Replace radial BFS in App.tsx handleScaffold with dagre
4. Replace radial BFS in scripts/cli.ts scaffold handler with dagre
5. Add `layout` console command in App.tsx handleCommand
6. Rewrite SemanticEdge.tsx to use angle-based handle override
7. (Phase 2) Add ResizeObserver to node components for accurate heights
```

## New Dependencies

```
@dagrejs/dagre   ^1.0.4   — layout engine (browser + Node.js compatible)
```

No other dependencies needed. The smart edge approach is pure math inside the existing
SemanticEdge component.
