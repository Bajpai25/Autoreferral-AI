export type Candidate = {
  id: string
  name: string
  company: string
  title: string
  status: 'Connection Sent' | 'Message Sent' | 'Replied' | 'Ignored' | string
}

export type Job = {
  id: string
  createdAt: string
  url?: string
  company: string
  title: string
  status?: 'Not started' | 'Draft' | 'In progress' | 'Completed' | string
  targetRoles?: string
  tone?: 'Warm' | 'Professional' | 'Casual' | string
  preview?: string
  candidates?: Candidate[]
}
