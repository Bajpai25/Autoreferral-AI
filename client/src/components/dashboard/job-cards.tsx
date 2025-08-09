import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type Job } from '@/types'

type JobCardsProps = {
  jobs?: Job[]
}

export function JobCards({ jobs = [] }: JobCardsProps) {
  const items = jobs.slice(0, 3)
  return (
    <div className="space-y-3">
      <h3 className="font-medium">Dashboard</h3>
      <div className="space-y-3">
        {items.map((j) => (
          <Card key={j.id} className="hover:bg-neutral-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{j.company}</div>
                  <div className="text-sm text-neutral-600">{j.title}</div>
                </div>
                <Badge variant="secondary">{j.status ?? 'Not started'}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-neutral-500">No jobs yet.</p>
        ) : null}
      </div>
    </div>
  )
}
