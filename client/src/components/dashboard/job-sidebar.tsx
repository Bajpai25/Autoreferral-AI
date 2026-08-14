import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2 } from 'lucide-react'
import { type Job } from '@/types'
import { cn } from '@/lib/utils'
import { gsap } from '@/lib/gsap'
import { useMagnetic } from '@/lib/use-magnetic'

type JobSidebarProps = {
  jobs?: Job[]
  activeJobId?: string | null
  onSelectJob?: (id: string) => void
  onNew?: () => void
}

export function JobSidebar({
  jobs = [],
  activeJobId = null,
  onSelectJob = () => {},
  onNew = () => {},
}: JobSidebarProps) {
  const newBtnRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  useMagnetic(newBtnRef as any, 0.2)

  // Animate active job highlight transition
  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('.sidebar-job-btn')
    items.forEach((item) => {
      const el = item as HTMLElement
      const isActive = el.dataset.jobId === activeJobId
      gsap.to(el, {
        borderColor: isActive ? 'rgba(0,255,255,0.5)' : 'rgba(255,255,255,0.05)',
        backgroundColor: isActive ? 'rgba(0,255,255,0.1)' : 'rgba(255,255,255,0.05)',
        scale: isActive ? 1.02 : 1,
        duration: 0.35,
        ease: 'power2.out',
      })
    })
  }, [activeJobId])

  return (
    <div className="flex h-full flex-col relative z-10 font-sans rounded-[32px] border border-white/5 bg-[#050505]/60 backdrop-blur-3xl shadow-2xl overflow-hidden">
      <div className="border-b border-white/5 p-6 bg-white/5">
        <Button
          ref={newBtnRef as any}
          className="w-full gap-2 rounded-full shadow-[0_0_15px_rgba(0,255,255,0.2)] bg-cyan-500 hover:bg-cyan-400 text-black font-bold h-12"
          onClick={onNew}
        >
          <Plus className="size-4" /> New Setup
        </Button>
      </div>
      <ScrollArea className="h-[440px] md:h-[560px]">
        <div className="min-w-[280px] w-full">
          <ul ref={listRef} className="p-3 space-y-2">
            {jobs.map((job) => (
            <li key={job.id}>
              <button
                data-job-id={job.id}
                className={cn(
                  'sidebar-job-btn w-full rounded-[24px] border p-4 text-left transition-all duration-300 group',
                  activeJobId === job.id 
                    ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_30px_rgba(0,255,255,0.1)]' 
                    : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                )}
                onClick={() => onSelectJob(job.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("size-8 rounded-full flex items-center justify-center border", activeJobId === job.id ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400" : "bg-white/5 border-white/10 text-neutral-400")}>
                    <Building2 className="size-4" />
                  </div>
                  <div className="truncate flex-1">
                    <div className="font-semibold text-white truncate">{job.company}</div>
                    <div className="text-xs text-cyan-400/80 truncate">{job.title}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="secondary" className={cn("text-[10px] bg-transparent border", activeJobId === job.id ? "border-cyan-500/30 text-cyan-300" : "border-white/10 text-neutral-400")}>
                    {job.status ?? 'Not started'}
                  </Badge>
                  <span className="text-[10px] text-neutral-500">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            </li>
          ))}
          {jobs.length === 0 ? (
            <li className="p-4 text-sm text-neutral-500 italic text-center">No jobs yet. Create your first job.</li>
          ) : null}
          </ul>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
