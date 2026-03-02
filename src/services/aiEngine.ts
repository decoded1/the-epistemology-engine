import { GoogleGenAI, Type } from "@google/genai";
import { AppNode, AppEdge, AppNodeType, SemanticRelationType } from "../types";
import { GEMINI_MODEL } from "../config";

const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please set VITE_GEMINI_API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

export const aiEngine = {
  /**
   * Generates a connective synthesis for Concept and Branch nodes based on their references.
   */
  async synthesizeConcept(title: string, references: string[]): Promise<string> {
    if (!references.length) return "No references available to synthesize.";

    const prompt = `You are the synthesis engine for an epistemology knowledge graph.
    The user is developing a concept called "${title}".
    
    Here are the extracted excerpts attached to this concept:
    ${references.map((r, i) => `[${i + 1}] "${r}"`).join("\n")}
    
    Provide a single, powerful connective paragraph (max 400 characters) that synthesizes these points into a unified epistemological insight. Identify patterns or tensions. Do not use preamble.`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    return response.text || "";
  },

  /**
   * Generates a balanced synthesis for Claim nodes, weighing supporting vs counter evidence.
   */
  async synthesizeClaim(title: string, supporting: string[], counter: string[]): Promise<string> {
    const prompt = `You are the synthesis engine for an epistemology knowledge graph.
    The user is evaluating the claim: "${title}".
    
    Supporting Evidence:
    ${supporting.length ? supporting.map((r, i) => `[${i + 1}] "${r}"`).join("\n") : "None."}
    
    Counterevidence:
    ${counter.length ? counter.map((r, i) => `[${i + 1}] "${r}"`).join("\n") : "None."}
    
    Provide a single paragraph (max 500 characters) that weighs both sides. Articulate the strongest version of the claim, the strongest objection to it, and where the balance of evidence currently sits. Be objective and rigorous. No preamble.`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    return response.text || "";
  },

  /**
   * Handles natural language queries from the Console, scoped to the current graph context.
   */
  async scaffoldWeb(
    topic: string,
    existingNodes: AppNode[]
  ): Promise<{
    topic: string;
    rootId: string;
    nodes: { tempId: string; type: AppNodeType; title: string; description: string }[];
    edges: { from: string; to: string; relationType: SemanticRelationType }[];
  }> {
    const existingTitles = existingNodes.map(n => n.data.title).filter(Boolean);
    const contextNote = existingTitles.length
      ? `\n\nExisting nodes on the graph (avoid duplicating these titles): ${existingTitles.join(', ')}`
      : '';

    const prompt = `You are a knowledge graph architect. Build a thought web skeleton for a researcher exploring this topic: "${topic}".${contextNote}

Rules:
- Create 6 to 9 nodes total
- Mix node types: "concept" for core ideas or themes, "branch" for sub-areas worth exploring separately, "claim" for specific propositions that can be argued for or against
- Titles: 2 to 5 words, punchy and specific — no generic titles like "Overview" or "Introduction"
- Descriptions: 1 to 2 sentences explaining the node's role in this web of ideas
- Create 5 to 10 edges that capture meaningful intellectual relationships
- Designate one node as rootId — the central organizing concept all others relate to
- Be intellectually substantive: generate the kind of web a serious thinker would actually want to explore
- For each edge relationType, choose exactly one of these five values: "supports", "contradicts", "refines", "prerequisite", "extends"`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
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

    const parsed = JSON.parse(response.text || '{}');
    return parsed;
  },

  async executeConsoleCommand(command: string, nodes: AppNode[], edges: AppEdge[], selectedIds: string[]): Promise<string> {
    const selectedNodes = nodes.filter(n => selectedIds.includes(n.id));

    const context = {
      graphSummary: `${nodes.length} nodes, ${edges.length} edges.`,
      selectedNodes: selectedNodes.map(n => ({ title: n.data.title, type: n.type }))
    };

    const prompt = `You are the Console interface for the Epistemology Engine.
    User Command: "${command}"
    
    Context:
    ${JSON.stringify(context, null, 2)}
    
    Respond concisely to the user's command. If they ask about the graph, analyze the structure provided. If they ask a factual question, ground it ONLY in the provided node data. If no data answers it, state that explicitly.`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    return response.text || "";
  },

  /**
   * Suggest 3-5 new nodes that could be added to expand the selected node.
   * Returns structured cards the user can one-click accept into the graph.
   */
  async suggestExpansions(
    query: string,
    anchorNode: AppNode,
    allNodes: AppNode[],
    allEdges: AppEdge[]
  ): Promise<{
    suggestions: {
      title: string;
      description: string;
      relationType: SemanticRelationType;
      nodeType: AppNodeType;
    }[];
  }> {
    const existingTitles = allNodes.map(n => n.data.title).filter(Boolean);
    const connectedEdges = allEdges.filter(
      e => e.source === anchorNode.id || e.target === anchorNode.id
    );
    const connectedNodes = connectedEdges.map(e => {
      const otherId = e.source === anchorNode.id ? e.target : e.source;
      const other = allNodes.find(n => n.id === otherId);
      return other ? `"${other.data.title}" (${e.data?.relationType ?? 'connected'})` : null;
    }).filter(Boolean);

    const prompt = `You are an expert knowledge graph assistant for the Epistemology Engine.

The user is exploring the node: "${anchorNode.data.title}" (type: ${anchorNode.type})
Description: ${anchorNode.data.description ?? 'none'}

Already connected to:
${connectedNodes.length ? connectedNodes.map(c => `  - ${c}`).join('\n') : '  (no connections yet)'}

User's query: "${query}"

Existing graph nodes (do NOT duplicate these titles): ${existingTitles.join(', ')}

Generate 3 to 5 distinct, intellectually substantive suggestions for NEW nodes that could be added to expand "${anchorNode.data.title}" in the direction the user is asking.

For each suggestion:
- title: 2–5 words, specific and punchy
- description: 1 sentence explaining what this node represents
- relationType: exactly one of "supports", "contradicts", "refines", "prerequisite", "extends"
  (choose based on how this new node would relate TO the anchor node)
- nodeType: exactly one of "concept", "branch", "claim"
  (use "claim" for specific propositions, "branch" for sub-areas, "concept" for ideas/themes)

Be specific to the domain — avoid generic placeholders.`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  relationType: { type: Type.STRING, enum: ['supports', 'contradicts', 'refines', 'prerequisite', 'extends'] },
                  nodeType: { type: Type.STRING, enum: ['concept', 'branch', 'claim'] },
                },
                required: ['title', 'description', 'relationType', 'nodeType'],
              },
            },
          },
          required: ['suggestions'],
        },
      },
    });

    return JSON.parse(response.text || '{"suggestions":[]}');
  },
};