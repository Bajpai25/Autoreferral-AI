import  { useCallback, useRef } from 'react';
import {
  Background,
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  type Connection,
  type Node,
  type Edge,
  type OnConnectEnd,
  type NodeProps,
  type OnNodesChange,
  type OnEdgesChange,
  Controls,
  MiniMap,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

// --- 1. Types & Interfaces ---

interface CustomNodeData {
  label: string;
}

// Defining our specific Node type to use throughout the app
type MyNode = Node<CustomNodeData>;

// --- 2. Custom Node Component ---

const MyCustomNode = ({ data }: NodeProps<MyNode>) => {
  return (
    <div style={{ 
      padding: '10px 20px', 
      borderRadius: '8px', 
      background: '#ffffff', 
      border: '2px solid #3b82f6',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      fontSize: '12px',
      fontWeight: 'bold',
      textAlign: 'center',
      minWidth: '100px'
    }}>
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: '#3b82f6' }} 
      />
      <div>{data.label}</div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={true}
        style={{ background: '#3b82f6' }} 
      />
    </div>
  );
};

// Map the custom string key to the component
const nodeTypes = {
  custom: MyCustomNode,
};

// --- 3. Initial State ---

const initialNodes: MyNode[] = [
  {
    id: '0',
    type: 'custom',
    data: { label: 'Start Node' },
    position: { x: 250, y: 50 },
  },
];

let id = 1;
const getId = () => `${id++}`;

// --- 4. Main Logic Component ---

const AddNodeOnEdgeDrop = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // useNodesState and useEdgesState provide the state and the change handlers
  const [nodes, setNodes, onNodesChange]: [MyNode[], any, OnNodesChange<MyNode>] = useNodesState<MyNode>(initialNodes);
  const [edges, setEdges, onEdgesChange]: [Edge[], any, OnEdgesChange] = useEdgesState([]);
  
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds:Connection) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      // If the connection didn't land on an existing node
      if (!connectionState.isValid && connectionState.fromNode) {
        const newNodeId = getId();
        
        // Handle both Mouse and Touch events for position
        const { clientX, clientY } =
          'changedTouches' in event 
            ? (event as TouchEvent).changedTouches[0] 
            : (event as MouseEvent);

        const newNode: MyNode = {
          id: newNodeId,
          type: 'custom', // Matches the key in nodeTypes
          position: screenToFlowPosition({
            x: clientX,
            y: clientY,
           }),
          data: { label: `Node ${newNodeId}` },
          origin: [0.5, 0.0],
        };

        const newEdge: Edge = { 
          id: `e-${connectionState.fromNode.id}-${newNodeId}`, 
          source: connectionState.fromNode.id, 
          target: newNodeId,
          animated: true
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) => eds.concat(newEdge));
      }
    },
    [screenToFlowPosition, setNodes, setEdges],
  );

  return (
    <div 
      className="text-black wrapper" 
      ref={reactFlowWrapper} 
      
      style={{ width: '100vw', height: '100vh',  }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        fitView
        nodeOrigin={[0.5, 0]}
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls/>
        <MiniMap/>
      </ReactFlow>
    </div>
  );
};

// --- 5. Export with Provider ---

export default function App() {
  return (
    <ReactFlowProvider>
      <AddNodeOnEdgeDrop />
    </ReactFlowProvider>
  );
}