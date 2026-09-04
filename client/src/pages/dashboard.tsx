import { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { JobSidebar } from '@/components/dashboard/job-sidebar'
import { AddJobForm } from '@/components/dashboard/add-job-form'
import { JobCards } from '@/components/dashboard/job-cards'
import { JobTable } from '@/components/dashboard/job-table'
import { Button } from '@/components/ui/button'
import { type Job } from '@/types'
import { Plus, X, Workflow } from 'lucide-react'
import { getJobs, getOutreach } from '@/utils/api'
import { TraceModal } from '@/components/dashboard/trace-modal'
import { SiteHeader } from '@/components/site-header'
import { Link } from 'react-router-dom'
import { gsap } from '@/lib/gsap'
import './WorkflowBuilder.css'

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [outreach, setOutreach] = useState<any[]>([])
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [workflowTabs, setWorkflowTabs] = useState<Array<{ id: string; jobId: string | null; label: string; workflowId?: string }>>([
    { id: 'outreach-new-1', jobId: null, label: 'New outreach' },
  ])
  const [activeWorkflowTabId, setActiveWorkflowTabId] = useState('outreach-new-1')
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const mainRef = useRef<HTMLElement>(null)

  // Notification popup state (shared with WorkflowBuilder)
  const [polledResults, setPolledResults] = useState<Array<{ name: string; profileUrl?: string; status: 'sent'|'failed'; error?: string }>>([]);
  const [noticeItem, setNoticeItem] = useState<{ name: string; profileUrl?: string; status: 'sent'|'failed'; error?: string } | null>(null);
  const noticeQueueRef = useRef<Array<{ name: string; profileUrl?: string; status: 'sent'|'failed'; error?: string }>>([]);
  const noticeTimerRef = useRef<number | null>(null);
  const lastShownRef = useRef<string | null>(null);
  const shownKeysRef = useRef<Set<string>>(new Set());
  const [noticeVisible, setNoticeVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // GSAP entry animations
  useLayoutEffect(() => {
    if (!mainRef.current) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.fromTo('.dash-greeting', { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.6 })
      tl.fromTo('.dash-subtitle', { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.5 }, '-=0.3')
      tl.fromTo('.dash-actions', { autoAlpha: 0, y: 15 }, { autoAlpha: 1, y: 0, duration: 0.4 }, '-=0.3')

      // Panels stagger
      tl.fromTo('.dash-panel',
        { autoAlpha: 0, y: 30, scale: 0.97 },
        { autoAlpha: 1, y: 0, scale: 1, stagger: 0.12, duration: 0.6 },
        '-=0.2'
      )

      // Pipeline table ScrollTrigger
      gsap.fromTo('.dash-pipeline',
        { autoAlpha: 0, y: 40 },
        {
          autoAlpha: 1, y: 0, duration: 0.6,
          scrollTrigger: { trigger: '.dash-pipeline', start: 'top 88%' }
        }
      )
    }, mainRef.current)

    return () => ctx.revert()
  }, [])
   
  const getJobsList = async (userId: string) => {
    try {
      const data = await getJobs(userId)
      if (Array.isArray(data)) {
        const mappedJobs = data.map((job: any) => ({
          id: job.id,
          createdAt: job.createdAt,
          url: job.jobUrl,
          company: job.companyName || 'Unknown Company',
          title: job.role || 'Unknown Title',
          status: 'Active',
          candidates: []
        }))
        setJobs(mappedJobs)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getOutreachList = async (userId: string) => {
    try {
      const data = await getOutreach(userId)
      if (Array.isArray(data)) setOutreach(data)
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    const userId = localStorage.getItem("userId")
    if (userId) {
      getJobsList(userId)
      getOutreachList(userId)
    }
  }, [])

  const activeJob = useMemo(
    () => jobs.find((j) => j.id === activeJobId) ?? null,
    [jobs, activeJobId]
  )

  function handleCreateJob(partial: Omit<Job, 'id' | 'createdAt'>) {
    const newJob: Job = {
      id: Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
      ...partial,
    }
    setJobs((prev) => [newJob, ...prev])
    setActiveJobId(newJob.id)
    setWorkflowTabs((prev) => prev.map((tab) => tab.id === activeWorkflowTabId
      ? { ...tab, jobId: newJob.id, label: partial.company || 'Outreach workflow' }
      : tab
    ))
    return newJob.id
  }

  function updateJob(id: string, updater: (job: Job) => Job) {
    setJobs((prev) => prev.map((j) => (j.id === id ? updater(j) : j)))
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      sessionStorage.setItem('authToken', token)
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
      console.log("Token secured in session storage!")
    }
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  function startNewWorkflowTab() {
    const id = `outreach-new-${Date.now()}`
    setWorkflowTabs((prev) => [...prev, { id, jobId: null, label: 'New outreach' }])
    setActiveWorkflowTabId(id)
    setActiveJobId(null)
  }

  function handleWorkflowCreated(workflow: { id?: string; name: string }) {
    const nextId = `outreach-new-${Date.now()}`
    setWorkflowTabs((prev) => [
      ...prev.map((tab) => tab.id === activeWorkflowTabId
        ? { ...tab, label: workflow.name, workflowId: workflow.id }
        : tab
      ),
      { id: nextId, jobId: null, label: 'New outreach' },
    ])
    setActiveWorkflowTabId(nextId)
    setActiveJobId(null)
  }

  function closeWorkflowTab(id: string) {
    if (workflowTabs.length === 1) return
    const remaining = workflowTabs.filter((tab) => tab.id !== id)
    setWorkflowTabs(remaining)
    if (activeWorkflowTabId === id) {
      const next = remaining[remaining.length - 1]
      setActiveWorkflowTabId(next.id)
      setActiveJobId(next.jobId)
    }
  }

  // Poll for connection results and enqueue notifications
  useEffect(() => {
    const workflowIds = workflowTabs
      .map((tab) => tab.workflowId)
      .filter((id): id is string => Boolean(id));
    if (workflowIds.length === 0) return;

    let intervalId: number | undefined;
    let disposed = false;
    const fetchResults = async () => {
      try {
        const base = (import.meta.env.VITE_API_URL as string) || '';
        const endpoint = `${base.replace(/\/$/, '')}/workflows/workflow-results`;
        console.debug('[workflow-poll] requesting', workflowIds);
        const responses = await Promise.all(workflowIds.map(async (workflowId) => {
          const res = await fetch(`${endpoint}?workflowId=${encodeURIComponent(workflowId)}`);
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        }));
        if (!disposed) {
          const results = responses.flat();
          console.debug('[workflow-poll] received', results.length, 'results', results.map((item) => item.name));
          setPolledResults(results);
        }
      } catch (error) {
        if (!disposed) console.warn('[workflow-poll] request error', error);
      }
    };

    fetchResults();
    intervalId = window.setInterval(fetchResults, 3000);
    
    return () => {
      disposed = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [workflowTabs]);

  // audio
  const playNotification = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.0025; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 300);
    } catch {}
  };

  useEffect(() => {
    if (!polledResults || polledResults.length === 0) return;
    let added = false;
    for (let i = 0; i < polledResults.length; i++) {
      const item = polledResults[i];
      const key = `${item.name}-${item.status}-${item.error || ''}`;
      if (!shownKeysRef.current.has(key)) { noticeQueueRef.current.push(item); added = true; }
    }
    if (added && !noticeItem) showNextNotice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polledResults]);

  const clearNoticeTimer = () => { if (noticeTimerRef.current) { window.clearTimeout(noticeTimerRef.current as number); noticeTimerRef.current = null; } };
  const showNextNotice = () => {
    clearNoticeTimer();
    const next = noticeQueueRef.current.shift();
    if (!next) { setNoticeVisible(false); noticeTimerRef.current = window.setTimeout(() => setNoticeItem(null), 300); return; }
    setNoticeItem(next); setTimeout(() => setNoticeVisible(true), 20); playNotification(); lastShownRef.current = `${next.name}-${next.status}-${next.error || ''}`; shownKeysRef.current.add(lastShownRef.current);
    noticeTimerRef.current = window.setTimeout(() => { setNoticeVisible(false); noticeTimerRef.current = window.setTimeout(() => { setNoticeItem(null); showNextNotice(); }, 500); }, 5000);
  };

  useEffect(() => () => { clearNoticeTimer(); }, []);

  return (
    <div className="relative min-h-screen bg-[#030712] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <SiteHeader />
      <div className="fixed inset-0 z-0 bg-[#000000] pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full bg-[radial-gradient(circle,rgba(0,255,255,0.06),transparent_70%)] blur-3xl opacity-50" />
        <div className="absolute top-[20%] right-[-10%] w-[1000px] h-[1000px] rounded-full bg-[radial-gradient(circle,rgba(143,0,255,0.05),transparent_70%)] blur-3xl opacity-50" />
        <div className="absolute bottom-[-20%] left-[20%] w-[1200px] h-[1200px] rounded-full bg-[radial-gradient(circle,rgba(0,200,255,0.04),transparent_70%)] blur-3xl opacity-50" />
        <div 
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
            transform: `translate(${mousePosition.x * -0.01}px, ${mousePosition.y * -0.01}px)`
          }}
        />
      </div>

      <main ref={mainRef} className="container mx-auto px-4 py-8 relative z-10 mt-12">
        {/* Notifications stay above the workflow strip while tabs change. */}
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
                {noticeItem.status === 'sent' ? 'Referral Message sent' : (noticeItem.error || 'Failed to send')}
              </div>
            </div>
          </div>
        )}
        <div className="workflow-tabs" role="tablist" aria-label="Outreach workflows">
          <div className="workflow-tabs__items">
            {workflowTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeWorkflowTabId === tab.id}
                className={`workflow-tab ${activeWorkflowTabId === tab.id ? 'workflow-tab--active' : ''}`}
                onClick={() => {
                  setActiveWorkflowTabId(tab.id)
                  setActiveJobId(tab.jobId)
                }}
              >
                <Workflow className="size-3.5" />
                <span>{tab.label}</span>
                {workflowTabs.length > 1 && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Close ${tab.label}`}
                    className="workflow-tab__close"
                    onClick={(event) => { event.stopPropagation(); closeWorkflowTab(tab.id) }}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); closeWorkflowTab(tab.id) } }}
                  >
                    <X className="size-3" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <button type="button" className="workflow-tabs__add" onClick={startNewWorkflowTab} title="New outreach workflow">
            <Plus className="size-4" />
          </button>
        </div>
        <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-cyan-500/10 via-transparent to-indigo-500/10 z-0"></div>
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="dash-greeting gsap-reveal text-3xl md:text-4xl font-semibold tracking-tight text-white mb-2">
              {greeting}, {localStorage.getItem("name")}
            </h1>
            <p className="dash-subtitle gsap-reveal text-neutral-400 text-sm">
              Your pipeline is active. Manage processes and deploy targeted outreach agents.
            </p>
          </div>
          <div className="dash-actions gsap-reveal flex items-center gap-3">
            <Link to="/workflow-builder">
              <Button onClick={() => setActiveJobId(null)} variant="secondary" className="gap-2 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <Plus className="size-4" />
                New Flow
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 max-w-7xl mx-auto">
          <aside className="dash-panel gsap-reveal lg:col-span-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <JobSidebar jobs={jobs} activeJobId={activeJobId} onSelectJob={(id) => setActiveJobId(id)} onNew={() => setActiveJobId(null)} />
          </aside>

          <section className="dash-panel gsap-reveal lg:col-span-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
            <AnimatePresence mode="wait">
              <motion.div
                key={activeJobId ?? 'add-job'}
                initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                <AddJobForm
                  key={activeWorkflowTabId}
                  initialJob={activeJob ?? undefined}
                  onCreate={(j) => handleCreateJob(j)}
                  onUpdate={(updated) =>
                    activeJobId &&
                    updateJob(activeJobId, () => ({ ...(updated as Job), id: activeJobId, createdAt: activeJob?.createdAt ?? new Date().toISOString() }))
                  }
                  onWorkflowCreated={handleWorkflowCreated}
                />
              </motion.div>
            </AnimatePresence>
          </section>

          <section className="dash-panel gsap-reveal lg:col-span-3 space-y-6">
            <JobCards jobs={jobs} />
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
              <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                <span className="size-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,255,255,0.8)]" /> Quick Intel
              </h3>
              <ul className="list-disc pl-5 text-sm text-neutral-400 space-y-2 marker:text-cyan-500/50">
                <li>Input a job URL to scrape candidate data automatically.</li>
                <li>Upload target resumes to calibrate the outreach persona.</li>
                <li>Ensure automated pipelines are actively toggled on.</li>
              </ul>
            </div>
          </section>
        </div>

        <section className="dash-pipeline gsap-reveal mt-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-6 shadow-lg max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold">Active Outreach Pipeline</h2>
          </div>
          <JobTable outreach={outreach} onViewMessage={(id) => setSelectedTraceId(id)} onEdit={(id) => console.log('edit', id)} />
        </section>
      </main>

      <TraceModal isOpen={!!selectedTraceId} onClose={() => setSelectedTraceId(null)} data={outreach.find((o: any) => o.id === selectedTraceId)} />
    </div>
  )
}
