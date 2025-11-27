/**
 * Utility to parse markdown mindmap structure into react-flow nodes and edges
 */

export interface MindMapNode {
  id: string;
  data: { label: string };
  position: { x: number; y: number };
  type?: string;
  style?: any;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  style?: any;
  sourcePosition?: string;
  targetPosition?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface ParsedNode {
  id: string;
  label: string;
  level: number;
  children: ParsedNode[];
}

/**
 * Parse markdown content into a hierarchical tree structure
 */
function parseMarkdownToTree(content: string): ParsedNode[] {
  const lines = content.split('\n');
  const root: ParsedNode[] = [];
  const stack: ParsedNode[] = [];
  let nodeIdCounter = 0;
  let rootNode: ParsedNode | null = null;

  const createNode = (label: string, level: number): ParsedNode => {
    // Clean up label - remove markdown formatting
    const cleanLabel = label
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\*/g, '') // Remove italic
      .replace(/`/g, '') // Remove code backticks
      .replace(/^[-*]\s+/, '') // Remove list markers
      .trim();
    
    return {
      id: `node-${nodeIdCounter++}`,
      label: cleanLabel,
      level,
      children: []
    };
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---') continue;

    // Check for headings (H1 becomes root)
    let level = 0;
    let label = '';
    
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#+)\s+(.+)$/);
      if (match) {
        if (match[1].length === 1) {
          // H1 - this is the root
          rootNode = createNode(match[2], 0);
          stack.length = 0;
          stack.push(rootNode);
          continue;
        } else {
          level = match[1].length;
          label = match[2];
        }
      }
    } else if (line.match(/^\s*[-*]\s+/)) {
      // List item - use original line to count leading spaces (4 spaces = 1 level)
      const indentMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
      if (indentMatch) {
        const indentSpaces = indentMatch[1].length;
        // 0 spaces = level 1, 4 spaces = level 2, 8 spaces = level 3, etc.
        level = Math.floor(indentSpaces / 4) + 1;
        label = indentMatch[2].trim();
      }
    }

    if (!label && !trimmed.startsWith('#')) continue;

    // Skip if we don't have a root yet
    if (!rootNode && !trimmed.startsWith('#')) continue;

    const node = createNode(label || trimmed, level);

    // Find parent based on level
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      if (rootNode) {
        rootNode.children.push(node);
      } else {
        root.push(node);
      }
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  // If we have a root node, return it
  if (rootNode) {
    return [rootNode];
  }
  
  // If no root node but we have root-level items, create a default root
  if (root.length > 0) {
    const defaultRoot: ParsedNode = {
      id: 'root-default',
      label: 'Mind Map',
      level: 0,
      children: root
    };
    return [defaultRoot];
  }
  
  // If we have items in the stack but no root, try to create one
  if (stack.length > 0) {
    // Use the first item as root
    const firstItem = stack[0];
    firstItem.level = 0;
    return [firstItem];
  }
  
  return root;
}

/**
 * Calculate positions for nodes in a hierarchical horizontal layout
 * Shows up to 4 levels: Root (left) -> Level 1 -> Level 2 -> Level 3
 */
function calculatePositions(
  nodes: ParsedNode[],
  rootX: number = 100,
  rootY: number = 400,
  level1X: number = 400,
  level2X: number = 700,
  level3X: number = 1000,
  verticalSpacing: number = 100
): { nodes: MindMapNode[], edges: MindMapEdge[] } {
  const flowNodes: MindMapNode[] = [];
  const flowEdges: MindMapEdge[] = [];
  let edgeIdCounter = 0;

  if (nodes.length === 0) return { nodes: flowNodes, edges: flowEdges };

  const rootNode = nodes[0];
  
  // Create root node (light purple)
  const rootFlowNode: MindMapNode = {
    id: rootNode.id,
    data: { label: rootNode.label },
    position: { x: rootX, y: rootY },
    style: {
      background: '#e9d5ff', // Light purple
      color: '#1f2937',
      border: '2px solid #c084fc',
      borderRadius: '12px',
      padding: '20px',
      fontSize: '16px',
      fontWeight: '600',
      minWidth: 250,
      maxWidth: 280,
      textAlign: 'left',
      wordWrap: 'break-word',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
  };
  flowNodes.push(rootFlowNode);

  // Get all children (level 1)
  const level1Children = rootNode.children.filter(child => child.level === 1);
  
  if (level1Children.length === 0) {
    return { nodes: flowNodes, edges: flowEdges };
  }

  // Recursively process children and calculate positions
  let currentY = 100; // Start from top
  
  const processNode = (
    node: ParsedNode,
    parentId: string,
    x: number,
    y: number,
    depth: number
  ): number => {
    // Determine style based on depth
    let nodeStyle: any;
    if (depth === 1) {
      nodeStyle = {
        background: '#dbeafe', // Light blue
        color: '#1f2937',
        border: '2px solid #93c5fd',
        borderRadius: '10px',
        padding: '14px',
        fontSize: '14px',
        fontWeight: '500',
        minWidth: 220,
        maxWidth: 250,
        textAlign: 'left',
        wordWrap: 'break-word',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      };
    } else if (depth === 2) {
      nodeStyle = {
        background: '#e0e7ff', // Light indigo
        color: '#1f2937',
        border: '2px solid #a5b4fc',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '13px',
        fontWeight: '500',
        minWidth: 200,
        maxWidth: 230,
        textAlign: 'left',
        wordWrap: 'break-word',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      };
    } else if (depth === 3) {
      nodeStyle = {
        background: '#f3e8ff', // Light purple
        color: '#1f2937',
        border: '2px solid #c4b5fd',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '12px',
        fontWeight: '400',
        minWidth: 180,
        maxWidth: 210,
        textAlign: 'left',
        wordWrap: 'break-word',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      };
    }

    // Create node
    const flowNode: MindMapNode = {
      id: node.id,
      data: { label: node.label },
      position: { x, y },
      style: nodeStyle
    };
    flowNodes.push(flowNode);

    // Create edge from parent
    if (parentId) {
      flowEdges.push({
        id: `edge-${edgeIdCounter++}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        sourcePosition: 'right',
        targetPosition: 'left',
        style: {
          stroke: depth === 1 ? '#a78bfa' : depth === 2 ? '#8b5cf6' : '#c4b5fd',
          strokeWidth: depth === 1 ? 2 : 1.5
        }
      });
    }

    let nextY = y;
    
    // Process children (up to depth 3, so we show 4 levels total including root)
    if (depth < 3 && node.children.length > 0) {
      const children = node.children;
      let childY = y;
      
      // Calculate total height needed for all children
      const totalChildrenHeight = children.length * verticalSpacing;
      const startChildY = y - (totalChildrenHeight / 2) + (verticalSpacing / 2);
      childY = startChildY;
      
      // Determine X position for next level
      let nextX: number;
      if (depth === 1) {
        nextX = level2X;
      } else if (depth === 2) {
        nextX = level3X;
      } else {
        nextX = x + 300; // Fallback
      }
      
      for (const child of children) {
        childY = processNode(child, node.id, nextX, childY, depth + 1);
        childY += verticalSpacing;
      }
      
      nextY = Math.max(y, childY - verticalSpacing);
    }
    
    return nextY;
  };

  // Process level 1 children
  let level1Y = 100;
  for (const child of level1Children) {
    level1Y = processNode(child, rootNode.id, level1X, level1Y, 1);
    level1Y += verticalSpacing;
  }

  // Center the root vertically relative to all children
  const totalHeight = level1Y - 100;
  const centerY = 100 + (totalHeight / 2);
  rootFlowNode.position.y = centerY;

  return { nodes: flowNodes, edges: flowEdges };
}

/**
 * Main function to convert markdown mindmap to react-flow format
 */
export function parseMindmapToFlow(content: string): { nodes: MindMapNode[], edges: MindMapEdge[] } {
  const tree = parseMarkdownToTree(content);
  
  if (tree.length === 0) {
    // Fallback: create a single node
    return {
      nodes: [{
        id: 'root',
        data: { label: 'Mind Map' },
        position: { x: 0, y: 0 },
        style: {
          background: '#6366f1',
          color: '#ffffff',
          border: '2px solid #4f46e5',
          borderRadius: '8px',
          padding: '10px'
        }
      }],
      edges: []
    };
  }

  return calculatePositions(tree);
}

