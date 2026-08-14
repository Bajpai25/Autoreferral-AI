import { useState, useCallback } from 'react';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  ReactFlowProvider,
  MiniMap,
  
} from '@xyflow/react';
import type {Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange} from "@xyflow/react"

import '@xyflow/react/dist/style.css';
// import { AddNodeOnEdgeDrop } from './customNodes';

// these are the initial edges 
const initialNodes: Node[] = [
  { id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Profile' }   },
  { id: 'n2', position: { x: 0, y: 100 }, data: { label: 'Company' } },
  {id:'n3' , position:{x:0 , y:200},data:{label:"Connections Number"}},
  {id:'n4' , position:{x:0 , y:300},data:{label:"Schedule Cron"}},
  {id:'n5',position:{x:0 , y:400} , data:{label:"Frequency"}}
];

// these are the initial edges
const initialEdges: Edge[] = [
  { id: 'n1-n2', source: 'n1', target: 'n2' , animated:true , type: 'step',
    label: 'connects with' },
  {id:'n3-n2' , source:'n2' , target:'n3' , animated:true, type: 'step',
    label: 'connects with',},
  {id:'n4-n3' , source:'n3' , target:'n4' , animated:true , type: 'step',
    label: 'connects with',},
  {id:'n5-n6' , source:'n4' , target:'n5' , animated:true , type: 'step',
    label: 'connects with',}
];

export default function Flow() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nodesSnapshot) =>
        applyNodeChanges(changes, nodesSnapshot)
      ),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((edgesSnapshot) =>
        applyEdgeChanges(changes, edgesSnapshot)
      ),
    []
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((edgesSnapshot) =>
        addEdge({...params, animated:true}, edgesSnapshot)
      ),
    []
  );

  return (
    <ReactFlowProvider>
    <div className='text-black'  style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
      
      <Background/>
      <Controls/>
      <MiniMap/>
      </ReactFlow>
    </div>
    </ReactFlowProvider>
  );
}