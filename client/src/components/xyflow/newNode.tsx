
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

// 1. Define the shape of your Node's data
type CustomNodeData = {
  label: string;
};

// 2. Define the Custom Node Component with NodeProps
const MyCustomNode = ({ data }: NodeProps<Node<CustomNodeData>>) => {
  return (
    <div style={{ 
      padding: '10px', 
      borderRadius: '5px', 
      background: '#fff', 
      border: '1px solid #1a192b' 
    }}>
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// 3. Map the custom node type
const nodeTypes = {
  custom: MyCustomNode,
};