import { getUserWorkflows } from '@/utils/api';
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { addEdge, applyNodeChanges, applyEdgeChanges, type Node, type Edge, type Connection, type NodeChange, type EdgeChange } from '@xyflow/react';

export interface SavedWorkflow {
  id: string;
  userId: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  savedWorkflows: SavedWorkflow[];
  activeWorkflowId: string | null;
  workflowName: string;
}

const STORAGE_KEY = 'autoreferral_saved_workflows';



function persistWorkflows(workflows: SavedWorkflow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
}

const defaultNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 250, y: 150 },
    data: { label: 'Schedule Trigger', cron: '0 9 * * *', scheduleType: 'daily', scheduleTime: '09:00', scheduleDay: '1' },
  },
  {
    id: 'action-1',
    type: 'action',
    position: { x: 250, y: 320 },
    data: { label: 'LinkedIn Automation', companyName: '', maxConnections: 10 },
  }
];

const defaultEdges: Edge[] = [
  { id: 'e-trigger1-action1', source: 'trigger-1', target: 'action-1', animated: true, style: { stroke: '#525252', strokeWidth: 1.5 } }
];

export const fetchSavedWorkflows = createAsyncThunk('workflow/fetchSavedWorkflows', async () => {
  const data = await getUserWorkflows();
  return data || [];
});

const initialState: WorkflowState = {
  nodes: defaultNodes,
  edges: defaultEdges,
  selectedNodeId: null,
  // loadSavedWorkflows is async; initial state must be synchronous.
  // Start with an empty array and fetch asynchronously elsewhere if needed.
  savedWorkflows: [],
  activeWorkflowId: null,
  workflowName: 'Untitled Workflow',
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    onNodesChange: (state, action: PayloadAction<NodeChange[]>) => {
      state.nodes = applyNodeChanges(action.payload, state.nodes);
    },
    onEdgesChange: (state, action: PayloadAction<EdgeChange[]>) => {
      state.edges = applyEdgeChanges(action.payload, state.edges);
    },
    onConnect: (state, action: PayloadAction<Connection>) => {
      state.edges = addEdge({ ...action.payload, animated: true, style: { stroke: '#525252', strokeWidth: 1.5 } }, state.edges);
    },
    setSelectedNodeId: (state, action: PayloadAction<string | null>) => {
      state.selectedNodeId = action.payload;
    },
    clearSelection: (state) => {
      // Deselect all nodes in ReactFlow AND clear our tracked selection
      state.selectedNodeId = null;
      state.nodes = state.nodes.map(n => ({ ...n, selected: false }));
    },
    updateNodeData: (state, action: PayloadAction<{ id: string; data: any }>) => {
      const node = state.nodes.find((n) => n.id === action.payload.id);
      if (node) {
        node.data = { ...node.data, ...action.payload.data };
      }
    },
    addNode: (state, action: PayloadAction<Node>) => {
      state.nodes.push(action.payload);
    },
    setWorkflowName: (state, action: PayloadAction<string>) => {
      state.workflowName = action.payload;
    },
    saveWorkflow: (state) => {
      const now = new Date().toISOString();
      const userId = localStorage.getItem('userId') || '';
      if (state.activeWorkflowId) {
        const idx = state.savedWorkflows.findIndex(w => w.id === state.activeWorkflowId);
        if (idx !== -1) {
          state.savedWorkflows[idx] = {
            ...state.savedWorkflows[idx],
            name: state.workflowName,
            userId,
            nodes: JSON.parse(JSON.stringify(state.nodes)),
            edges: JSON.parse(JSON.stringify(state.edges)),
            updatedAt: now,
          };
        }
      } else {
        const id = `wf-${Date.now()}`;
        state.savedWorkflows.push({
          id,
          userId,
          name: state.workflowName,
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
          createdAt: now,
          updatedAt: now,
        });
        state.activeWorkflowId = id;
      }
      persistWorkflows(state.savedWorkflows);
    },
    loadWorkflow: (state, action: PayloadAction<string>) => {
      const wf = state.savedWorkflows.find(w => w.id === action.payload);
      if (wf) {
        state.nodes = Array.isArray(wf.nodesJson) ? JSON.parse(JSON.stringify(wf.nodesJson)) : JSON.parse(JSON.stringify(defaultNodes));
        state.edges = Array.isArray(wf.edgesJson) ? JSON.parse(JSON.stringify(wf.edgesJson)) : JSON.parse(JSON.stringify(defaultEdges));
        state.activeWorkflowId = wf.id;
        state.workflowName = wf.name;
        state.selectedNodeId = null;
      }
    },
    deleteWorkflow: (state, action: PayloadAction<string>) => {
      state.savedWorkflows = state.savedWorkflows.filter(w => w.id !== action.payload);
      if (state.activeWorkflowId === action.payload) {
        state.activeWorkflowId = null;
        state.workflowName = 'Untitled Workflow';
        state.nodes = JSON.parse(JSON.stringify(defaultNodes));
        state.edges = JSON.parse(JSON.stringify(defaultEdges));
        state.selectedNodeId = null;
      }
      persistWorkflows(state.savedWorkflows);
    },
    newWorkflow: (state) => {
      state.nodes = JSON.parse(JSON.stringify(defaultNodes));
      state.edges = JSON.parse(JSON.stringify(defaultEdges));
      state.activeWorkflowId = null;
      state.workflowName = 'Untitled Workflow';
      state.selectedNodeId = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchSavedWorkflows.fulfilled, (state, action: PayloadAction<any[]>) => {
      state.savedWorkflows = Array.isArray(action.payload) ? action.payload : [];
    });
    builder.addCase(fetchSavedWorkflows.rejected, (_state, action) => {
      console.error('Failed to fetch workflows:', action.error);
    });
  },
});

export const {
  onNodesChange, onEdgesChange, onConnect, setSelectedNodeId, clearSelection,
  updateNodeData, addNode, setWorkflowName, saveWorkflow, loadWorkflow, deleteWorkflow, newWorkflow,
} = workflowSlice.actions;
export default workflowSlice.reducer;
