import { useRef, useEffect, useCallback, useState } from 'react'
import { X, Network, FileText, Activity } from 'lucide-react'
import { gsap } from '@/lib/gsap'

type TraceModalProps = {
  isOpen: boolean
  onClose: () => void
  data: any | null
}

export function TraceModal({ isOpen, onClose, data }: TraceModalProps) {
  const [activeTab, setActiveTab] = useState<'payload' | 'telemetry' | 'meta'>('payload')
  const backdropRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const tabIndicatorRef = useRef<HTMLDivElement>(null)

  // Animate open/close
  useEffect(() => {
    if (!backdropRef.current || !modalRef.current) return

    if (isOpen && data) {
      gsap.set(backdropRef.current, { display: 'flex' })
      gsap.to(backdropRef.current, { autoAlpha: 1, duration: 0.3 })
      gsap.fromTo(modalRef.current,
        { autoAlpha: 0, scale: 0.92, y: 30 },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)', delay: 0.1 }
      )
    } else {
      gsap.to(modalRef.current, { autoAlpha: 0, scale: 0.95, y: 20, duration: 0.25, ease: 'power2.in' })
      gsap.to(backdropRef.current, {
        autoAlpha: 0, duration: 0.3, delay: 0.1,
        onComplete: () => { if (backdropRef.current) gsap.set(backdropRef.current, { display: 'none' }) }
      })
    }
  }, [isOpen, data])

  // Tab content slide
  useEffect(() => {
    if (!contentRef.current) return
    gsap.fromTo(contentRef.current,
      { autoAlpha: 0, x: 15 },
      { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power2.out' }
    )
  }, [activeTab])

  if (!data) return null

  const tabs = [
    { id: 'payload' as const, icon: FileText, label: 'Message Payload' },
    { id: 'telemetry' as const, icon: Activity, label: 'Telemetry' },
    { id: 'meta' as const, icon: Network, label: 'Metadata' },
  ]

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 items-center justify-center p-4 hidden"
      style={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#030712]/80 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,255,255,0.05)] text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shadow-[0_0_15px_rgba(0,255,255,0.2)]">
              <Network className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Trace Data</h2>
              <p className="text-xs text-neutral-400">Node ID: {data.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors" title="Close Modal">
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6 relative">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-cyan-400' : 'text-neutral-400 hover:text-white'}`}
            >
              <div className="flex items-center gap-2"><tab.icon className="size-4" /> {tab.label}</div>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_#00FFFF]" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div ref={contentRef} className="p-6 h-[300px] overflow-y-auto">
          {activeTab === 'payload' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {data.message}
              </div>
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Status</p>
                <p className="text-lg font-semibold text-white capitalize flex items-center gap-2">
                  <span className="size-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00FFFF]"></span>
                  {data.status}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Dispatches</p>
                <p className="text-lg font-semibold text-white capitalize flex items-center gap-2">
                  {data.messageCount !== null ? data.messageCount : 0} Attempts
                </p>
              </div>
              <div className="col-span-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                <p className="text-xs text-indigo-300 uppercase tracking-wider mb-1">Last Transmission</p>
                <p className="text-sm font-medium text-indigo-100">{new Date(data.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          )}

          {activeTab === 'meta' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Job Reference</p>
                  <p className="text-sm font-medium text-neutral-300 break-all">{data.jobId}</p>
                </div>
                <div className="h-px w-full bg-white/5" />
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Initiator ID</p>
                  <p className="text-sm font-medium text-neutral-300 break-all">{data.userId}</p>
                </div>
                <div className="h-px w-full bg-white/5" />
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Creation Timestamp</p>
                  <p className="text-sm font-medium text-neutral-300">{new Date(data.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
