import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SiteHeader } from '@/components/site-header'
import { JobSidebar } from '@/components/dashboard/job-sidebar'
import { AddJobForm } from '@/components/dashboard/add-job-form'
import { JobCards } from '@/components/dashboard/job-cards'
import { JobTable } from '@/components/dashboard/job-table'
import { SettingsSheet } from '@/components/settings/settings-sheet'
import { Button } from '@/components/ui/button'
import { type Candidate, type Job } from '@/types'
import { sampleJobs } from '@/utils/sample-data'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    // hydrate with sample data on first load, then persist
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('jobs') : null
    if (saved) {
      setJobs(JSON.parse(saved))
    } else {
      setJobs(sampleJobs)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('jobs', JSON.stringify(jobs))
    }
  }, [jobs])

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
  }

  function updateJob(id: string, updater: (job: Job) => Job) {
    setJobs((prev) => prev.map((j) => (j.id === id ? updater(j) : j)))
  }

  function addCandidate(jobId: string, candidate: Candidate) {
    updateJob(jobId, (j) => ({
      ...j,
      candidates: [candidate, ...(j.candidates ?? [])],
    }))
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader onOpenSettings={() => setSettingsOpen(true)} />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button onClick={() => setActiveJobId(null)} variant="secondary" className="gap-2">
              <Plus className="size-4" />
              New
            </Button>
            <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <motion.aside
            layout
            className="lg:col-span-3 rounded-xl border bg-white"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <JobSidebar
              jobs={jobs}
              activeJobId={activeJobId}
              onSelectJob={(id) => setActiveJobId(id)}
              onNew={() => setActiveJobId(null)}
            />
          </motion.aside>

          <motion.section
            layout
            className="lg:col-span-6 rounded-xl border bg-white p-4 md:p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeJobId ?? 'add-job'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <AddJobForm
                  key={activeJobId ?? 'form'}
                  initialJob={activeJob ?? undefined}
                  onCreate={(j) => handleCreateJob(j)}
                  onUpdate={(updated) =>
                    activeJobId &&
                    updateJob(activeJobId, () => ({ ...(updated as Job), id: activeJobId, createdAt: activeJob?.createdAt ?? new Date().toISOString() }))
                  }
                />
              </motion.div>
            </AnimatePresence>
          </motion.section>

          <motion.section
            layout
            className="lg:col-span-3 space-y-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <JobCards jobs={jobs} />
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-medium mb-3">Quick Tips</h3>
              <ul className="list-disc pl-5 text-sm text-neutral-600 space-y-1">
                <li>Paste a job or company URL to begin.</li>
                <li>Upload a resume to personalize outreach.</li>
                <li>Pick tone and target roles before sending.</li>
              </ul>
            </div>
          </motion.section>
        </div>

        <motion.section
          className="mt-6 rounded-xl border bg-white p-4 md:p-6"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold">Add Job — Candidates</h2>
          </div>
          <JobTable
            candidates={
              (activeJob?.candidates ??
                [
                  {
                    id: 'c1',
                    name: 'John Doe',
                    company: 'Google',
                    title: 'Software Engineer',
                    status: 'Connection Sent',
                  },
                  {
                    id: 'c2',
                    name: 'Phya R.',
                    company: 'Google',
                    title: 'Frontend Engineer',
                    status: 'Message Sent',
                  },
                ]) as Candidate[]
            }
            onViewMessage={(id) => console.log('view', id)}
            onEdit={(id) => console.log('edit', id)}
          />
        </motion.section>
      </main>
    </div>
  )
}
