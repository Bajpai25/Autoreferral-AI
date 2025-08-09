import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, ChevronRight, Sparkles } from 'lucide-react'
import { type Job } from '@/types'

type AddJobFormProps = {
  initialJob?: Job
  onCreate?: (job: Omit<Job, 'id' | 'createdAt'>) => void
  onUpdate?: (job: Omit<Job, 'id' | 'createdAt'>) => void
}

type Step = 1 | 2 | 3 | 4

export function AddJobForm({
  initialJob,
  onCreate = () => {},
  onUpdate = () => {},
}: AddJobFormProps) {
  const [step, setStep] = useState<Step>(1)
  const [url, setUrl] = useState(initialJob?.url ?? '')
  const [company, setCompany] = useState(initialJob?.company ?? '')
  const [title, setTitle] = useState(initialJob?.title ?? '')
  const [targetRoles, setTargetRoles] = useState(initialJob?.targetRoles ?? 'Software Engineer')
  const [tone, setTone] = useState(initialJob?.tone ?? 'Warm')
  const [preview, setPreview] = useState(initialJob?.preview ?? '')
  const [status, setStatus] = useState(initialJob?.status ?? 'Not started')
  const [fileName, setFileName] = useState<string | null>(null)

  useEffect(() => {
    if (!preview) {
      setPreview(
        `Hi there — I’m exploring opportunities for a ${title || 'role'} at ${company || 'your company'}. Would you be open to a quick chat or referral?`
      )
    }
  }, [company, title])

  const isEditing = useMemo(() => Boolean(initialJob?.id), [initialJob])

  function next() {
    setStep((s) => Math.min(4, s + 1) as Step)
  }
  function back() {
    setStep((s) => Math.max(1, s - 1) as Step)
  }

  function finish() {
    const payload: Omit<Job, 'id' | 'createdAt'> = {
      url,
      company: company || 'Unknown Company',
      title: title || 'Unknown Role',
      targetRoles,
      tone,
      preview,
      status,
      candidates: initialJob?.candidates ?? [],
    }
    if (isEditing) {
      onUpdate(payload)
    } else {
      onCreate(payload)
    }
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg md:text-xl">Add Job</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ol className="mb-4 flex items-center gap-2 text-xs">
          {[1, 2, 3, 4].map((i) => (
            <li
              key={i}
              className={
                'flex items-center gap-2 ' +
                (step >= i ? 'text-neutral-900' : 'text-neutral-400')
              }
            >
              <span
                className={
                  'size-5 inline-flex items-center justify-center rounded-full border ' +
                  (step >= i ? 'bg-neutral-900 text-white' : '')
                }
              >
                {i}
              </span>
              <span className="hidden sm:inline">
                {i === 1
                  ? 'Paste URL'
                  : i === 2
                  ? 'Upload resume'
                  : i === 3
                  ? 'Configure'
                  : 'Preview'}
              </span>
              {i < 4 ? <ChevronRight className="size-3 text-neutral-300" /> : null}
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="grid gap-3">
                <Label htmlFor="url">1. Paste job or company URL</Label>
                <Input
                  id="url"
                  placeholder="https://company.com/careers/software-engineer"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Google"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    placeholder="Software Engineer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={next} className="gap-2">
                  Continue <ChevronRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <Label>2. Upload resume (optional)</Label>
              <label
                htmlFor="resume"
                className="flex cursor-pointer items-center justify-between rounded-lg border bg-neutral-50 px-4 py-6"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md border bg-white p-2">
                    <Upload className="size-4" />
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{fileName ?? 'Choose a file'}</div>
                    <div className="text-neutral-500">PDF, DOCX allowed</div>
                  </div>
                </div>
                <Button variant="outline" type="button">
                  Browse
                </Button>
              </label>
              <input
                id="resume"
                type="file"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={back}>
                  Back
                </Button>
                <Button onClick={next} className="gap-2">
                  Continue <ChevronRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="grid gap-2">
                <Label>3. Configure outreach</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="targetRoles">Target roles</Label>
                    <Input
                      id="targetRoles"
                      placeholder="e.g., Software Engineer"
                      value={targetRoles}
                      onChange={(e) => setTargetRoles(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Message tone</Label>
                    <Select value={tone} onValueChange={(v) => setTone(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Warm">Warm</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Casual">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={back}>
                  Back
                </Button>
                <Button onClick={next} className="gap-2">
                  Continue <ChevronRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="grid gap-2">
                <Label>4. Preview</Label>
                <Textarea
                  rows={6}
                  value={preview}
                  onChange={(e) => setPreview(e.target.value)}
                  placeholder="Your outreach preview will appear here..."
                />
                <p className="text-xs text-neutral-500">
                  Tip: personalize the first sentence for better response rates.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={back}>
                  Back
                </Button>
                <Button onClick={finish} className="gap-2">
                  <Sparkles className="size-4" />
                  {initialJob ? 'Save' : 'Finish'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
