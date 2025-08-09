

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { type Candidate } from '@/types'

type JobTableProps = {
  candidates?: Candidate[]
  onViewMessage?: (id: string) => void
  onEdit?: (id: string) => void
}

export function JobTable({
  candidates = [],
  onViewMessage = () => {},
  onEdit = () => {},
}: JobTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.name} — {c.company}</TableCell>
              <TableCell>{c.title}</TableCell>
              <TableCell>{c.status}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onViewMessage(c.id)}>View Message</Button>
                  <Button variant="outline" size="sm" onClick={() => onEdit(c.id)}>View / Edit</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {candidates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-neutral-500">
                No candidates yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  )
}
