import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getScheduleLabel(data: Record<string, unknown>): string {
  const type = (data.scheduleType as string) || 'daily';
  const time = (data.scheduleTime as string) || '09:00';
  const day = (data.scheduleDay as string) || '1';

  switch (type) {
    case 'hourly': return 'Every hour';
    case 'daily': return `Daily at ${time}`;
    case 'weekly': return `Weekly ${DAYS[Number(day)] || 'Mon'} at ${time}`;
    case 'custom': return (data.cron as string) || 'Custom';
    default: return (data.cron as string) || 'Not configured';
  }
}

export const TriggerNode = ({ data, selected }: NodeProps) => {
  return (
    <div
      className={`
        trigger-node
        ${selected ? 'trigger-node--selected' : ''}
      `}
    >
      <div className="trigger-node__accent" />
      <div className="trigger-node__body">
        <div className="trigger-node__icon">
          <Clock size={13} strokeWidth={2.2} />
        </div>
        <div className="trigger-node__info">
          <span className="trigger-node__label">{data.label as string || 'Schedule Trigger'}</span>
          <span className="trigger-node__meta">{getScheduleLabel(data)}</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="wf-handle wf-handle--trigger"
      />
    </div>
  );
};
