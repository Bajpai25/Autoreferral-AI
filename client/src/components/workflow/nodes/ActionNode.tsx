import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';

export const ActionNode = ({ data, selected }: NodeProps) => {
  return (
    <div
      className={`
        action-node
        ${selected ? 'action-node--selected' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="wf-handle wf-handle--action"
      />
      <div className="action-node__accent" />
      <div className="action-node__body">
        <div className="action-node__icon">
          <Zap size={15} strokeWidth={2.2} />
        </div>
        <div className="action-node__info">
          <span className="action-node__label">{data.label as string || 'Action'}</span>
          <span className="action-node__meta">
            {data.companyName ? `Target: ${data.companyName}` : 'No target set'}
          </span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="wf-handle wf-handle--action"
      />
    </div>
  );
};
