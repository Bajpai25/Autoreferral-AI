import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2 } from 'lucide-react'
import { type Job } from '@/types'
import { cn } from '@/lib/utils'

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
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <Button className="w-full gap-2" onClick={onNew}>
          <Plus className="size-4" /> New
        </Button>
      </div>
      <ScrollArea className="h-[440px] md:h-[560px]">
        <ul className="p-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <button
                className={cn(
                  'w-full rounded-lg border p-3 text-left hover:bg-neutral-50',
                  activeJobId === job.id ? 'border-neutral-900 bg-neutral-50' : 'border-transparent'
                )}
                onClick={() => onSelectJob(job.id)}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-neutral-500" />
                  <div className="truncate">
                    <div className="font-medium truncate">{job.company}</div>
                    <div className="text-xs text-neutral-500 truncate">{job.title}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
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
            <li className="p-3 text-sm text-neutral-500">No jobs yet. Create your first job.</li>
          ) : null}
        </ul>
      </ScrollArea>
    </div>
  )
}
