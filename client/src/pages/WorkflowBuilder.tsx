import React, { useMemo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap } from '@xyflow/react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  onNodesChange, onEdgesChange, onConnect, setSelectedNodeId, clearSelection,
  updateNodeData, setWorkflowName, saveWorkflow, loadWorkflow, deleteWorkflow, newWorkflow,
} from '../store/workflowSlice';
import { fetchSavedWorkflows } from '../store/workflowSlice';
import { TriggerNode } from '../components/workflow/nodes/TriggerNode';
import { ActionNode } from '../components/workflow/nodes/ActionNode';
import '@xyflow/react/dist/style.css';
import './WorkflowBuilder.css';
import {
  Save, FolderOpen, Plus, X, Trash2, Clock, Zap, Menu, ChevronDown, Play,
} from 'lucide-react';
import { createAndTriggerWorkflow } from '../utils/api';
import { SiteHeader } from '@/components/site-header';
import { gsap } from '@/lib/gsap';

export default function WorkflowBuilder() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    nodes, edges, selectedNodeId, savedWorkflows, activeWorkflowId, workflowName,
  } = useSelector((state: RootState) => state.workflow);
console.log("Saved Workflows:", savedWorkflows);
  const userId = localStorage.getItem('userId') || '';
  // savedWorkflows may be non-array during initialization; guard defensively
  const userWorkflows = Array.isArray(savedWorkflows)
    ? savedWorkflows.filter((w) => w.userId === userId)
    : [];
  

  const [showSaved, setShowSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const savedRef = useRef<HTMLDivElement>(null);
  const [deployedWorkflowId, setDeployedWorkflowId] = useState<string | null>(null);
  const [polledResults, setPolledResults] = useState<Array<{ name: string; profileUrl?: string; status: 'sent'|'failed'; error?: string }>>([]);
  // notification queue for popup cards
  const [noticeItem, setNoticeItem] = useState<{ name: string; profileUrl?: string; status: 'sent'|'failed'; error?: string } | null>(null);
  const noticeQueueRef = useRef<Array<{ name: string; profileUrl?: string; status: 'sent'|'failed'; error?: string }>>([]);
  const noticeTimerRef = useRef<number | null>(null);
  const lastShownRef = useRef<string | null>(null);
  const shownKeysRef = useRef<Set<string>>(new Set());
  const [noticeVisible, setNoticeVisible] = useState(false);

  const nodeTypes = useMemo(() => ({
    trigger: TriggerNode,
    action: ActionNode,
  }), []);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Load saved workflows from API on mount
  useEffect(() => {
    dispatch(fetchSavedWorkflows());
  }, [dispatch]);

  // Close saved dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (savedRef.current && !savedRef.current.contains(e.target as HTMLElement)) {
        setShowSaved(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // GSAP toolbar button hover effects
  useLayoutEffect(() => {
    const btns = document.querySelectorAll('.wf-toolbar__btn');
    btns.forEach((btn) => {
      const el = btn as HTMLElement;
      const enter = () => gsap.to(el, { scale: 1.05, boxShadow: '0 0 15px rgba(0,255,255,0.2)', duration: 0.25, ease: 'power2.out' });
      const leave = () => gsap.to(el, { scale: 1, boxShadow: 'none', duration: 0.25, ease: 'power2.out' });
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });

    // Node palette cards hover
    const nodeCards = document.querySelectorAll('.wf-sidebar__node-card');
    nodeCards.forEach((card) => {
      const el = card as HTMLElement;
      const enter = () => gsap.to(el, { y: -3, boxShadow: '0 4px 20px rgba(0,255,255,0.1)', duration: 0.3, ease: 'power2.out' });
      const leave = () => gsap.to(el, { y: 0, boxShadow: 'none', duration: 0.3, ease: 'power2.out' });
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });
  }, []);

  // Properties panel slide animation
  useEffect(() => {
    const panel = document.querySelector('.wf-props') as HTMLElement;
    if (!panel) return;
    if (selectedNode) {
      gsap.fromTo(panel, { x: 40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out' });
    }
  }, [selectedNodeId]);

  const handleSave = () => {
    dispatch(saveWorkflow());
  };

  const handleLoad = (id: string) => {
    dispatch(loadWorkflow(id));
    setShowSaved(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dispatch(deleteWorkflow(id));
  };

  const handleNew = () => {
    dispatch(newWorkflow());
    setShowSaved(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ─── Start / Deploy workflow to backend ───
  const handleStart = async () => {
    if (isDeploying) return;

    // Extract trigger node data (cron) and action node data (company, maxConnections)
    const triggerNode = nodes.find(n => n.type === 'trigger');
    const actionNode = nodes.find(n => n.type === 'action');

    if (!triggerNode || !actionNode) {
      alert('Workflow must have at least one Trigger and one Action node.');
      return;
    }

    const targetCompany = (actionNode.data.companyName as string) || '';
    if (!targetCompany.trim()) {
      alert('Please set a Target Company in the Action node properties.');
      return;
    }

    // Save locally first
    dispatch(saveWorkflow());

    setIsDeploying(true);
    try {
      const created = await createAndTriggerWorkflow({
        name: workflowName || 'Untitled Workflow',
        targetCompany,
        cronExpression: (triggerNode.data.cron as string) || '0 9 * * *',
        maxConnections: (actionNode.data.maxConnections as number) || 10,
        connectionNote: (actionNode.data.connectionNote as string) || undefined,
        nodesJson: nodes,
        edgesJson: edges,
      });

      // capture created workflow id to start polling
      const wid = created?.id || created?.workflowId || null;
      if (wid) setDeployedWorkflowId(String(wid));

      alert('✅ Workflow deployed and running!');
    } catch (err: any) {
      console.error('Deploy error:', err);
      alert(`❌ Failed to deploy: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  // Polling for connection results every 2s when a workflow is deployed/selected
  useEffect(() => {
    let intervalId: any;
    const wid = deployedWorkflowId || activeWorkflowId;
    if (!wid) return;

    const fetchResults = async () => {
      try {
        const base = (import.meta.env.VITE_API_URL as string) || '';
        const url = `${base.replace(/\/$/, '')}/workflows/workflow-results?workflowId=${encodeURIComponent(wid)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
            if (Array.isArray(data)) {
              console.debug('[poll] got', data.length, 'results');
              setPolledResults(data);
            }
      } catch (e) {
        // ignore network errors for polling
      }
    };

    // initial fetch then interval
    fetchResults();
    intervalId = setInterval(fetchResults, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [deployedWorkflowId, activeWorkflowId]);

  // play a short notification beep using Web Audio API (no external file)
  const playNotification = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880; // A6
      g.gain.value = 0.0025;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.12);
      // ramp down quickly
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      // close context shortly after
      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 300);
    } catch (e) {
      // fallback: no-op
    }
  };

  // When polledResults updates, enqueue newest unseen result to show as popup
  useEffect(() => {
    if (!polledResults || polledResults.length === 0) return;
    // Enqueue any items that haven't been shown yet (handles batches)
    let added = false;
    for (let i = 0; i < polledResults.length; i++) {
      const item = polledResults[i];
      const key = `${item.name}-${item.status}-${item.error || ''}`;
      if (!shownKeysRef.current.has(key)) {
        console.debug('[notify] enqueue', key);
        noticeQueueRef.current.push(item);
        added = true;
      }
    }
    if (added && !noticeItem) showNextNotice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polledResults]);

  const clearNoticeTimer = () => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current as number);
      noticeTimerRef.current = null;
    }
  };

  const showNextNotice = () => {
    clearNoticeTimer();
    const next = noticeQueueRef.current.shift();
    if (!next) {
      setNoticeVisible(false);
      // ensure unmounted after short delay
      noticeTimerRef.current = window.setTimeout(() => setNoticeItem(null), 300);
      return;
    }
    setNoticeItem(next);
    // small delay to allow mount -> then mark visible for CSS enter
    setTimeout(() => setNoticeVisible(true), 20);
    playNotification();
    lastShownRef.current = `${next.name}-${next.status}-${next.error || ''}`;
    shownKeysRef.current.add(lastShownRef.current);
    console.debug('[notify] showNext', lastShownRef.current);
    // show for 3s then hide (start exit) then unmount and show next
    noticeTimerRef.current = window.setTimeout(() => {
      setNoticeVisible(false);
      noticeTimerRef.current = window.setTimeout(() => {
        setNoticeItem(null);
        showNextNotice();
      }, 500);
    }, 5000);
  };

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearNoticeTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  console.log(noticeItem)
 

  return (
    <div className="wf-page">
      <SiteHeader />
       {/* ─── Notification Toast ─── */}
      {noticeItem && (
        <div
          className={`wf-notice-toast ${noticeVisible ? 'wf-notice-toast--visible' : ''} ${
            noticeItem.status === 'failed' ? 'wf-notice-toast--error' : ''
          }`}
        >
          <div className="wf-notice-toast__icon">
            {noticeItem.status === 'sent' ? '✓' : '✕'}
          </div>
          <div className="wf-notice-toast__content">
            <div className="wf-notice-toast__name">{noticeItem.name}</div>
            <div className="wf-notice-toast__status">
              {noticeItem.status === 'sent'
                ? 'Connection request sent'
                : (noticeItem.error || 'Failed to send')}
            </div>
          </div>
        </div>
      )}
  

      <div className="wf-shell">
        {/* Mobile overlay */}
        <div
          className={`wf-overlay ${sidebarOpen ? 'wf-overlay--visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

      {/* ─── Left Sidebar ─── */}
      <aside className={`wf-sidebar ${sidebarOpen ? 'wf-sidebar--open' : ''}`}>
        <div className="wf-sidebar__header">
          <div className="wf-sidebar__title">Node Palette</div>
        </div>
        <div className="wf-sidebar__nodes">
          <div className="wf-sidebar__node-card">
            <div className="wf-sidebar__node-icon wf-sidebar__node-icon--trigger">
              <Clock size={14} />
            </div>
            <span className="wf-sidebar__node-name">Trigger</span>
          </div>
          <div className="wf-sidebar__node-card">
            <div className="wf-sidebar__node-icon wf-sidebar__node-icon--action">
              <Zap size={14} />
            </div>
            <span className="wf-sidebar__node-name">Action</span>
          </div>
          <span className="wf-sidebar__node-hint">Drag & drop coming soon</span>
        </div>
      </aside>
     
      
     

      {/* ─── Canvas ─── */}
      <div className="wf-canvas">
        {/* Toolbar */}
        <div className="wf-toolbar">
          <div className="wf-toolbar__left">
            <button
              className="wf-toolbar__menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <Menu size={16} />
            </button>
            <input
              className="wf-toolbar__name-input"
              type="text"
              value={workflowName}
              onChange={e => dispatch(setWorkflowName(e.target.value))}
              placeholder="Workflow name…"
            />
          </div>

          <div className="wf-toolbar__right">
            <button className="wf-toolbar__btn" onClick={handleNew}>
              <Plus size={14} />
              <span className="wf-toolbar__btn-text">New</span>
            </button>

            <button className="wf-toolbar__btn wf-toolbar__btn--primary" onClick={handleSave}>
              <Save size={14} />
              <span className="wf-toolbar__btn-text">{activeWorkflowId ? 'Update' : 'Save'}</span>
            </button>

            <button
              className={`wf-toolbar__btn wf-toolbar__btn--start ${isDeploying ? 'wf-toolbar__btn--loading' : ''}`}
              onClick={handleStart}
              disabled={isDeploying}
            >
              <Play size={14} />
              <span className="wf-toolbar__btn-text">{isDeploying ? 'Deploying…' : 'Start'}</span>
            </button>

            {/* Dev: test notice */}
            <button
              className="wf-toolbar__btn"
              onClick={() => {
                const sample = { name: 'Test User', status: 'sent' as const };
                noticeQueueRef.current.push(sample);
                if (!noticeItem) showNextNotice();
              }}
            >
              Test Notice
            </button>

            {/* Saved Workflows button */}
            <div ref={savedRef} style={{ position: 'relative' }}>
              <button
                className="wf-toolbar__btn wf-toolbar__btn--saved"
                onClick={() => setShowSaved(!showSaved)}
              >
                <FolderOpen size={14} />
                <span className="wf-toolbar__btn-text">Saved</span>
                {userWorkflows.length > 0 && (
                  <span className="wf-toolbar__badge">{userWorkflows.length}</span>
                )}
                <ChevronDown size={13} style={{
                  transition: 'transform 200ms',
                  transform: showSaved ? 'rotate(180deg)' : 'rotate(0)',
                }} />
              </button>

              {showSaved && (
                <div className="wf-saved-dropdown">
                  <div className="wf-saved-dropdown__header">
                    <span className="wf-saved-dropdown__title">Saved Workflows</span>
                    <button className="wf-saved-dropdown__new-btn" onClick={handleNew}>
                      <Plus size={13} /> New
                    </button>
                  </div>
                  {userWorkflows.length === 0 ? (
                    <div className="wf-saved-dropdown__empty">
                      No saved workflows yet.
                    </div>
                  ) : (
                    <div className="wf-saved-dropdown__list">
                      {userWorkflows.map(wf => (
                        <div
                          key={wf.id}
                          className={`wf-saved-item ${wf.id === activeWorkflowId ? 'wf-saved-item--active' : ''}`}
                          onClick={() => handleLoad(wf.id)}
                        >
                          <div className="wf-saved-item__info">
                            <div className="wf-saved-item__name">{wf.name}</div>
                            <div className="wf-saved-item__date">
                              {formatDate(wf.updatedAt)}
                            </div>
                          </div>
                          <div className="wf-saved-item__actions">
                            <button
                              className="wf-saved-item__action-btn wf-saved-item__action-btn--delete"
                              onClick={e => handleDelete(e, wf.id)}
                              title="Delete workflow"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
        </div>
 
       
       

        {/* React Flow Canvas */}
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes as any}
            edges={edges as any}
            onNodesChange={(c: any) => dispatch(onNodesChange(c))}
            onEdgesChange={(c: any) => dispatch(onEdgesChange(c))}
            onConnect={(params: any) => dispatch(onConnect(params))}
            onSelectionChange={({ nodes: selectedNodes }) => {
              if (selectedNodes.length > 0) {
                dispatch(setSelectedNodeId(selectedNodes[0].id));
              }
            }}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            style={{ background: 'var(--wf-bg)' }}
          >
            <Background color="#1c1c1c" gap={20} />
            <Controls />
            <MiniMap
              maskColor="rgba(0, 0, 0, 0.7)"
              nodeColor="#555"
              style={{ background: 'var(--wf-surface)' }}
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* ─── Properties Panel ─── */}
      <aside className={`wf-props ${!selectedNode ? 'wf-props--hidden' : ''}`}>
        <div className="wf-props__header">
          <span className="wf-props__title">Properties</span>
          <button
            className="wf-props__close"
            onClick={() => dispatch(clearSelection())}
          >
            <X size={14} />
          </button>
        </div>

        {selectedNode && (
          <div className="wf-props__body">
            <div className="wf-props__type-badge">
              {selectedNode.type === 'trigger' ? <Clock size={11} /> : <Zap size={11} />}
              {selectedNode.type}
            </div>

            <div className="wf-field">
              <label className="wf-field__label">Label</label>
              <input
                className="wf-field__input"
                type="text"
                value={selectedNode.data.label as string || ''}
                onChange={e => dispatch(updateNodeData({ id: selectedNode.id, data: { label: e.target.value } }))}
                placeholder="Node Name"
              />
            </div>

            {selectedNode.type === 'trigger' && (() => {
              const scheduleType = (selectedNode.data.scheduleType as string) || 'daily';
              const scheduleTime = (selectedNode.data.scheduleTime as string) || '09:00';
              const scheduleDay = (selectedNode.data.scheduleDay as string) || '1';

              const buildCron = (type: string, time: string, day: string) => {
                const [h, m] = time.split(':').map(Number);
                switch (type) {
                  case 'hourly': return '0 * * * *';
                  case 'daily': return `${m} ${h} * * *`;
                  case 'weekly': return `${m} ${h} * * ${day}`;
                  default: return selectedNode.data.cron as string || '0 9 * * *';
                }
              };

              const updateSchedule = (updates: Record<string, string>) => {
                const newType = updates.scheduleType ?? scheduleType;
                const newTime = updates.scheduleTime ?? scheduleTime;
                const newDay = updates.scheduleDay ?? scheduleDay;
                const cron = updates.scheduleType === 'custom'
                  ? (selectedNode.data.cron as string || '0 9 * * *')
                  : buildCron(newType, newTime, newDay);
                dispatch(updateNodeData({
                  id: selectedNode.id,
                  data: { ...updates, cron },
                }));
              };

              const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

              return (
                <>
                  <div className="wf-field">
                    <label className="wf-field__label">Schedule</label>
                    <div className="wf-schedule-tabs">
                      {(['hourly', 'daily', 'weekly', 'custom'] as const).map(t => (
                        <button
                          key={t}
                          className={`wf-schedule-tab ${scheduleType === t ? 'wf-schedule-tab--active' : ''}`}
                          onClick={() => updateSchedule({ scheduleType: t })}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(scheduleType === 'daily' || scheduleType === 'weekly') && (
                    <div className="wf-field">
                      <label className="wf-field__label">Time</label>
                      <input
                        className="wf-field__input"
                        type="time"
                        value={scheduleTime}
                        onChange={e => updateSchedule({ scheduleTime: e.target.value })}
                      />
                    </div>
                  )}

                  {scheduleType === 'weekly' && (
                    <div className="wf-field">
                      <label className="wf-field__label">Day of Week</label>
                      <div className="wf-day-selector">
                        {DAYS.map((d, i) => (
                          <button
                            key={d}
                            className={`wf-day-btn ${scheduleDay === String(i) ? 'wf-day-btn--active' : ''}`}
                            onClick={() => updateSchedule({ scheduleDay: String(i) })}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {scheduleType === 'custom' && (
                    <div className="wf-field">
                      <label className="wf-field__label">Cron Expression</label>
                      <input
                        className="wf-field__input"
                        type="text"
                        value={selectedNode.data.cron as string || ''}
                        onChange={e => dispatch(updateNodeData({ id: selectedNode.id, data: { cron: e.target.value } }))}
                        placeholder="e.g. 0 9 * * *"
                      />
                    </div>
                  )}

                  <div className="wf-field">
                    <label className="wf-field__label">Generated Cron</label>
                    <div className="wf-cron-preview">{selectedNode.data.cron as string}</div>
                  </div>
                </>
              );
            })()}

            {selectedNode.type === 'action' && (
              <>
                <div className="wf-field">
                  <label className="wf-field__label">Target Company</label>
                  <input
                    className="wf-field__input"
                    type="text"
                    value={selectedNode.data.companyName as string || ''}
                    onChange={e => dispatch(updateNodeData({ id: selectedNode.id, data: { companyName: e.target.value } }))}
                    placeholder="e.g. Google"
                  />
                </div>
                <div className="wf-field">
                  <div className="wf-field__label-row">
                    <label className="wf-field__label">Max Connections</label>
                    <span className="wf-field__value">{selectedNode.data.maxConnections as number}</span>
                  </div>
                  <input
                    className="wf-field__range"
                    type="range"
                    min="1"
                    max="50"
                    value={selectedNode.data.maxConnections as number || 10}
                    onChange={e => dispatch(updateNodeData({ id: selectedNode.id, data: { maxConnections: parseInt(e.target.value) } }))}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </aside>
      </div>
    </div>
  );
}
