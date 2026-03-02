import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ReactFlowProvider, Viewport } from '@xyflow/react';
import { EpistemologyGraph } from './components/graph/EpistemologyGraph';
import { Console } from './components/panels/Console';
import { Dock } from './components/panels/Dock';
import { EmptyState } from './components/panels/EmptyState';
import { LayoutPanel } from './components/panels/LayoutPanel';
import { ZoomIndicator } from './components/ui/ZoomIndicator';
import { ToastProps } from './components/ui/Toast';
import { useGraphStore } from './store/useGraphStore';
import { aiEngine } from './services/aiEngine';
import { AppNodeType, SemanticRelationType, ConceptNodeData, ClaimNodeData, Source } from './types';
import { applyDagreLayout, LayoutOptions } from './lib/layout';


export default function App() {
  const { nodes, edges, sources, addNode, addEdges, updateNodeData, repositionNodes, isDockOpen, setDockOpen } = useGraphStore();
  const fetchUnsortedExcerpts = useGraphStore(state => state.fetchUnsortedExcerpts);
  const fetchGraph = useGraphStore(state => state.fetchGraph);
  const fetchSources = useGraphStore(state => state.fetchSources);

  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [toast, setToast] = useState<Omit<ToastProps, 'onDismiss'> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFromDock, setIsDraggingFromDock] = useState(false);
  const [isFileDraggingOver, setIsFileDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const selectedNodes = nodes.filter(n => n.selected);

  const uploadEpub = useCallback(async (file: File) => {
    setToast({ message: `Importing ${file.name}...`, type: 'info' });
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:3001/api/ingest/epub', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setToast({ message: data.message, type: 'success' });
        fetchSources();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setToast({ message: `Upload failed: ${error.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  }, [fetchSources]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;
      if (!isInputFocused && (e.key === 'd' || e.key === 'D')) {
        setDockOpen(!isDockOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDockOpen, setDockOpen]);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      dragCounterRef.current++;
      setIsFileDraggingOver(true);
    };
    const handleDragLeave = () => {
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) setIsFileDraggingOver(false);
    };
    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsFileDraggingOver(false);
      const file = e.dataTransfer?.files[0];
      if (file?.name.endsWith('.epub')) {
        uploadEpub(file);
      } else if (file) {
        setToast({ message: 'Only .epub files are supported.', type: 'error' });
      }
    };
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [uploadEpub]);

  useEffect(() => {
    // Fetch initial state on load
    fetchUnsortedExcerpts();
    fetchGraph();
    fetchSources();

    let interval: ReturnType<typeof setInterval>;
    if (isProcessing) {
      interval = setInterval(() => {
        fetchUnsortedExcerpts();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, fetchUnsortedExcerpts, fetchGraph, fetchSources]);

  const handleCommand = async (cmd: string, edgeType?: SemanticRelationType, scope?: Source | null) => {
    if (!cmd.trim()) return;
    setIsProcessing(true);

    try {
      // Scoped query: user typed @source then a query → extract from that source
      if (scope) {
        setToast({ message: `Searching "${scope.name}" for "${cmd}"...`, type: 'info' });
        const res = await fetch('http://localhost:3001/api/excerpts/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: scope.id, query: cmd }),
        });
        const text = await res.text();
        let data: any;
        try { data = JSON.parse(text); } catch {
          throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`);
        }
        if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
        await fetchUnsortedExcerpts();
        setDockOpen(true);
        setToast({ message: data.message, type: data.count > 0 ? 'success' : 'info' });
        return;
      }

      const lowerCmd = cmd.toLowerCase();

      // Intercept 'import epub'
      if (lowerCmd === 'import epub' || lowerCmd === 'import') {
        fileInputRef.current?.click();
        return;
      }

      const scaffoldMatch = cmd.match(/^scaffold:\s*(.+)$/i);
      if (scaffoldMatch) {
        await handleScaffold(scaffoldMatch[1].trim());
        return;
      }

      // ── layout command ────────────────────────────────────────────────────
      if (lowerCmd === 'layout') {
        applyLayout();
        return;
      }

      if (lowerCmd === 'synthesize' && selectedNodes.length > 0) {
        const target = selectedNodes[0];
        let synthesis = '';

        if (target.type === 'concept' || target.type === 'branch') {
          const data = target.data as ConceptNodeData;
          const refs = [...(data.references?.literature || []), ...(data.references?.media || [])];
          synthesis = await aiEngine.synthesizeConcept(data.title, refs.map(r => r.text || ''));
        } else if (target.type === 'claim') {
          const data = target.data as ClaimNodeData;
          const sup = (data.supportingEvidence || []).map(r => r.text || '');
          const con = (data.counterEvidence || []).map(r => r.text || '');
          synthesis = await aiEngine.synthesizeClaim(data.title, sup, con);
        }

        if (synthesis) {
          updateNodeData(target.id, { synthesis });
          setToast({ message: 'Synthesis complete. Node updated.', type: 'success' });
        } else {
          setToast({ message: 'Could not generate synthesis. Not enough references.', type: 'error' });
        }
      } else {
        const response = await aiEngine.executeConsoleCommand(cmd, nodes, edges, selectedNodes.map(n => n.id));
        setToast({ message: response, type: 'info' });
      }
    } catch (error: any) {
      console.error(error);
      setToast({ message: error?.message ?? 'Unknown error.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNodeCreate = (type: AppNodeType, title: string) => {
    const id = `n-${Date.now()}`;
    const x = (-viewport.x + window.innerWidth / 2) / viewport.zoom - 150;
    const y = (-viewport.y + window.innerHeight / 2) / viewport.zoom - 50;

    const newNode: any = {
      id,
      type,
      position: { x, y },
      selected: true,
      data: {
        title,
        description: `New ${type} node created via Console.`,
        expanded: false,
        tags: []
      }
    };

    if (type === 'source') {
      newNode.data.sourceMeta = { format: '.epub', chapters: 0, excerpts: 0, linked: 0, indexed: 0, size: '0 KB' };
    } else if (type === 'claim') {
      newNode.data.conviction = 50;
      newNode.data.supportingEvidence = [];
      newNode.data.counterEvidence = [];
    } else {
      newNode.data.references = { literature: [], media: [] };
    }

    addNode(newNode);
    setToast({ message: `Created ${type}: ${title}`, type: 'success' });
  };

  const handleScaffold = async (topic: string) => {
    setIsProcessing(true);
    setToast({ message: `Building scaffold for "${topic}"…`, type: 'info' });
    try {
      console.log('[Scaffold] Calling AI for topic:', topic);
      const result = await aiEngine.scaffoldWeb(topic, nodes);
      console.log('[Scaffold] AI result:', result);
      if (!result?.nodes?.length) throw new Error('No nodes returned from AI.');

      // Place scaffold to the right of existing nodes, or at viewport center if canvas is empty
      let cx: number, cy: number;
      if (nodes.length === 0) {
        cx = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
        cy = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      } else {
        const maxX = Math.max(...nodes.map(n => n.position.x + (n.measured?.width ?? 300)));
        const avgY = nodes.reduce((sum, n) => sum + n.position.y + ((n.measured?.height ?? 120) / 2), 0) / nodes.length;
        cx = maxX + 400; // Shift cluster to the right
        cy = avgY;
      }

      // Dagre layout — superior topological engine
      const positions = applyDagreLayout(
        result.nodes.map((n: any) => n.tempId),
        result.edges.map((e: any) => ({ source: e.from, target: e.to })),
        {
          direction: 'LR',
          ranker: 'network-simplex',
          nodesep: 60,
          ranksep: 100,
          center: { x: cx, y: cy }
        },
      );

      // Build real IDs and create nodes
      const idMap: Record<string, string> = {};
      const ts = Date.now();
      result.nodes.forEach((n, i) => {
        idMap[n.tempId] = `n-${ts}-${i}`;
      });

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
        addNode({
          id: idMap[n.tempId],
          type: n.type,
          position: positions[n.tempId] ?? { x: cx, y: cy },
          selected: false,
          data: nodeData,
        } as any);
      }

      // Build and add edges
      const newEdges = result.edges
        .filter(e => idMap[e.from] && idMap[e.to])
        .map((e, i) => ({
          id: `e-${ts}-${i}`,
          source: idMap[e.from],
          target: idMap[e.to],
          type: 'semantic' as const,
          data: { relationType: e.relationType },
        }));
      addEdges(newEdges);

      setToast({ message: `Scaffold ready: ${result.nodes.length} nodes · ${newEdges.length} connections`, type: 'success' });
    } catch (err: any) {
      console.error('[Scaffold] Error:', err);
      setToast({ message: err?.message ?? 'Scaffold failed.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    uploadEpub(file);
  };

  // ── Shared layout runner used by console command + LayoutPanel ──────────
  const applyLayout = (opts: LayoutOptions = {}) => {
    if (nodes.length === 0) {
      setToast({ message: 'No nodes on canvas to layout.', type: 'info' });
      return;
    }
    const cx = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
    const cy = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
    const dimensions: Record<string, { width: number; height: number }> = {};
    nodes.forEach(n => {
      if (n.measured) {
        dimensions[n.id] = { width: n.measured.width ?? 300, height: n.measured.height ?? 120 };
      }
    });
    const positions = applyDagreLayout(
      nodes.map(n => n.id),
      edges.map(e => ({ source: e.source, target: e.target })),
      { direction: 'LR', ranker: 'network-simplex', nodesep: 60, ranksep: 100, ...opts, center: { x: cx, y: cy } },
      dimensions
    );
    repositionNodes(positions);
    setToast({ message: `Layout applied · ${nodes.length} nodes re-arranged.`, type: 'success' });
  };

  const { onNodesChange } = useGraphStore.getState();

  return (
    <ReactFlowProvider>
      <div className="w-screen h-screen overflow-hidden bg-bg-void relative">
        <input
          type="file"
          ref={fileInputRef}
          accept=".epub"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <EmptyState isVisible={nodes.length === 0} />

        <EpistemologyGraph onViewportChange={setViewport} />

        <Dock
          selectedNodes={selectedNodes}
          onDraggingChange={setIsDraggingFromDock}
        />

        <Console
          selectedNodes={selectedNodes}
          onCommand={handleCommand}
          onNodeCreate={handleNodeCreate}
          onDeselect={(id) => onNodesChange([{ id, type: 'select', selected: false }])}
          onClearSelection={() => {
            const changes = selectedNodes.map(n => ({ id: n.id, type: 'select' as const, selected: false }));
            onNodesChange(changes);
          }}
          isLoading={isProcessing}
          toast={toast ? { ...toast, onDismiss: () => setToast(null) } : null}
          onDismissToast={() => setToast(null)}
          sources={sources}
        />

        <ZoomIndicator zoom={viewport.zoom} />

        <LayoutPanel onApply={applyLayout} />

        {isFileDraggingOver && (
          <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
            <div className="absolute inset-0 bg-bg-void/60 backdrop-blur-sm border-2 border-dashed border-accent-blue/50 rounded-none" />
            <div className="relative flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-accent-blue-muted border border-accent-blue-border flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent-blue">
                  <path d="M12 16V8m0 0L9 11m3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 15a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-[15px] font-semibold text-text-primary">Drop to import</div>
                <div className="text-[12px] text-text-muted mt-1 font-mono">.epub</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
}