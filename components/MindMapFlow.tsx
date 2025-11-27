import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  Panel,
  Node,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { parseMindmapToFlow } from '../utils/mindmapParser';

interface MindMapFlowProps {
  content: string;
}

// Custom node component with handles on sides
const CustomNode = ({ data }: { data: { label: string } }) => {
  return (
    <>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left"
        style={{ 
          width: '10px',
          height: '10px',
          background: '#a78bfa',
          border: '2px solid #ffffff',
          borderRadius: '50%'
        }} 
      />
      <div style={{ 
        padding: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        {data.label}
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right"
        style={{ 
          width: '10px',
          height: '10px',
          background: '#a78bfa',
          border: '2px solid #ffffff',
          borderRadius: '50%'
        }} 
      />
    </>
  );
};

const MindMapFlow: React.FC<MindMapFlowProps> = ({ content }) => {
  const { nodes, edges } = useMemo(() => {
    const result = parseMindmapToFlow(content);
    // Add custom node type and handle IDs to edges
    const nodesWithType = result.nodes.map(node => ({
      ...node,
      type: 'custom'
    }));
    
    // Update edges to use specific handles
    const edgesWithHandles = result.edges.map(edge => ({
      ...edge,
      sourceHandle: 'right',
      targetHandle: 'left'
    }));
    
    return { nodes: nodesWithType, edges: edgesWithHandles };
  }, [content]);

  const nodeTypes = useMemo(() => ({
    custom: CustomNode
  }), []);
  const edgeTypes = useMemo(() => ({}), []);

  return (
    <div className="w-full" style={{ height: '700px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#ffffff' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.15,
          maxZoom: 1.2,
          minZoom: 0.3,
          includeHiddenNodes: false
        }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: '#a78bfa',
            strokeWidth: 2
          },
          sourcePosition: 'right',
          targetPosition: 'left'
        }}
        style={{
          background: '#ffffff'
        }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Controls 
          showInteractive={false}
          style={{
            button: {
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              color: '#6366f1'
            }
          }}
        />
      </ReactFlow>
    </div>
  );
};

export default MindMapFlow;

