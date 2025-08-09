import { type Job } from '@/types'

export const sampleJobs: Job[] = [
  {
    id: 'j1',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    url: 'https://careers.google.com/jobs/results/software-engineer',
    company: 'Google',
    title: 'Software Engineer',
    status: 'Not started',
    targetRoles: 'Software Engineer',
    tone: 'Warm',
    preview:
      'Hi there — I’m exploring opportunities for a Software Engineer role at Google. Would you be open to a quick chat or referral?',
    candidates: [
      { id: 'c1', name: 'John Doe', company: 'Google', title: 'Software Engineer', status: 'Connection Sent' },
    ],
  },
  {
    id: 'j2',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    url: 'https://acme.com/jobs/data-scientist',
    company: 'Acme Inc',
    title: 'Data Scientist',
    status: 'In progress',
    targetRoles: 'Data Scientist',
    tone: 'Professional',
    preview:
      'Hello — I’m interested in the Data Scientist role at Acme. Could you point me to the best contact for a referral?',
    candidates: [
      { id: 'c2', name: 'Alex K.', company: 'Acme Inc', title: 'Senior Data Scientist', status: 'Message Sent' },
    ],
  },
  {
    id: 'j3',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    url: 'https://teshco.com/careers/ux-designer',
    company: 'TeshCo',
    title: 'UX Designer',
    status: 'Draft',
    targetRoles: 'UX Designer',
    tone: 'Casual',
    preview:
      'Hi — I admire TeshCo’s design work. I’m exploring the UX Designer role and would love a quick referral if possible.',
    candidates: [],
  },
]
