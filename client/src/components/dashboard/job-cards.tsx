import { useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type Job } from '@/types'
import { gsap } from '@/lib/gsap'

type JobCardsProps = {
  jobs?: Job[]
}

export function JobCards({ jobs = [] }: JobCardsProps) {
  const items = jobs.slice(0, 3)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const cards = containerRef.current.querySelectorAll('.job-card-item')
    if (cards.length === 0) return

    const ctx = gsap.context(() => {
      gsap.fromTo(cards,
        { autoAlpha: 0, y: 20, scale: 0.95 },
        { autoAlpha: 1, y: 0, scale: 1, stagger: 0.1, duration: 0.5, ease: 'power3.out', delay: 0.3 }
      )
    }, containerRef.current)

    return () => ctx.revert()
  }, [items.length])

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white">Recent Workflows</h3>
      <div ref={containerRef} className="space-y-3">
        {items.map((j) => (
          <div key={j.id} className="job-card-item gsap-reveal">
            <Card className="hover:bg-[#0c0c0c]/80 transition-colors border-white/5 bg-[#050505]/60 backdrop-blur-3xl rounded-[24px] shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white tracking-tight">{j.company}</div>
                    <div className="text-sm text-neutral-400">{j.title}</div>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <span className="size-1.5 rounded-full bg-cyan-400 mr-2 shadow-[0_0_5px_#00FFFF] animate-pulse" />
                    {j.status ?? 'Active'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-neutral-500 italic">No workflows deployed.</p>
        ) : null}
      </div>
    </div>
  )
}
