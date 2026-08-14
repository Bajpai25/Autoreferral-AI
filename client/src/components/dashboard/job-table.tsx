import { useRef, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { gsap } from '@/lib/gsap'

type JobTableProps = {
  outreach?: any[]
  onViewMessage?: (id: string) => void
  onEdit?: (id: string) => void
}

export function JobTable({
  outreach = [],
  onViewMessage = () => {},
}: JobTableProps) {
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!tableRef.current) return
    const rows = tableRef.current.querySelectorAll('.table-row-item')
    if (rows.length === 0) return

    const ctx = gsap.context(() => {
      gsap.fromTo(rows,
        { autoAlpha: 0, x: -20 },
        { autoAlpha: 1, x: 0, stagger: 0.06, duration: 0.4, ease: 'power3.out', delay: 0.2 }
      )

      // Hover glow effect
      rows.forEach((row) => {
        const el = row as HTMLElement
        el.addEventListener('mouseenter', () => {
          gsap.to(el, {
            backgroundColor: 'rgba(255,255,255,0.05)',
            boxShadow: '0 0 20px rgba(0,255,255,0.05)',
            y: -1,
            duration: 0.25,
            ease: 'power2.out',
          })
        })
        el.addEventListener('mouseleave', () => {
          gsap.to(el, {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            y: 0,
            duration: 0.25,
            ease: 'power2.out',
          })
        })
      })
    }, tableRef.current)

    return () => ctx.revert()
  }, [outreach.length])

  return (
    <div ref={tableRef} className="w-full overflow-x-auto border border-white/5 rounded-[32px] bg-[#050505]/60 backdrop-blur-3xl shadow-2xl p-2">
      <Table>
        <TableHeader className="bg-transparent border-b border-white/5">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead className="text-neutral-500 font-medium tracking-wider text-xs uppercase px-6 py-5">Campaign Target</TableHead>
            <TableHead className="text-neutral-500 font-medium tracking-wider text-xs uppercase px-6 py-5">Status</TableHead>
            <TableHead className="text-neutral-500 font-medium tracking-wider text-xs uppercase px-6 py-5">Telemetry</TableHead>
            <TableHead className="text-neutral-500 font-medium tracking-wider text-xs uppercase px-6 py-5 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-white/5">
          {outreach.map((o) => (
            <TableRow key={o.id} className="table-row-item gsap-reveal border-none transition-colors group">
              <TableCell className="px-6 py-4 font-medium text-white">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                    #
                  </div>
                  Outreach Node <span className="text-neutral-500 font-normal ml-2">— {o.id.substring(0, 8)}</span>
                </div>
              </TableCell>
              <TableCell className="px-6 text-neutral-400">
                 <span className="capitalize">{o.status}</span>
              </TableCell>
              <TableCell className="px-6">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-300">
                  <span className="size-1.5 rounded-full bg-indigo-400 shadow-[0_0_5px_#8f00ff] animate-pulse" />
                  {o.messageCount ? `${o.messageCount} dispatched` : '0 dispatched'}
                </span>
              </TableCell>
              <TableCell className="px-4 text-right">
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => onViewMessage(o.id)} className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">Trace Data</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {outreach.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="text-neutral-500 text-center py-8 italic">
                No active targets in pipeline.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  )
}
