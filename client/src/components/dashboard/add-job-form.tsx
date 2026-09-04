import { useEffect, useMemo, useState, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Upload, Wand2, Loader2 } from "lucide-react"
import { type Job } from "@/types"
import { gsap } from "@/lib/gsap"

import {
  scrapeJobData,
  extractResumeData,
  combineJobandResume,
  getFinalMessage,
  createAndTriggerWorkflow,
  updateOutreachMessage,
} from "../../utils/api"

type AddJobFormProps = {
  initialJob?: Job
  onCreate?: (job: Omit<Job, "id" | "createdAt">) => string | void
  onUpdate?: (job: Omit<Job, "id" | "createdAt">) => void
  onWorkflowCreated?: (workflow: { id?: string; name: string }) => void
}

type Step = 1 | 2 | 3 | 4

export function AddJobForm({
  initialJob,
  onCreate = () => {},
  onUpdate = () => {},
  onWorkflowCreated = () => {},
}: AddJobFormProps) {
  const [step, setStep] = useState<Step>(1)
  const [url, setUrl] = useState(initialJob?.url ?? "")
  const [company, setCompany] = useState(initialJob?.company ?? "")
  const [title] = useState(initialJob?.title ?? "")
  const [targetRoles] = useState()
  const [tone, setTone] = useState(initialJob?.tone ?? "Warm")
  const [preview, setPreview] = useState(initialJob?.preview ?? "")
  const [status] = useState(initialJob?.status ?? "Not started")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [message, setmessage] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTonePicker, setShowTonePicker] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const stepRef = useRef<HTMLDivElement>(null)
  const uploadRef = useRef<HTMLLabelElement>(null)

  const isEditing = useMemo(() => Boolean(initialJob?.id), [initialJob])

  useEffect(() => {
    if (!preview) {
      setPreview(
        `Hi there — I'm exploring opportunities for a ${title || "role"} at ${company || "your company"}. Would you be open to a quick chat or referral?`
      )
    }
  }, [company, title])

  // GSAP step transition
  useEffect(() => {
    if (!stepRef.current) return
    gsap.fromTo(stepRef.current,
      { autoAlpha: 0, x: 30 },
      { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power3.out' }
    )
  }, [step])

  // Upload zone pulse on drag
  useEffect(() => {
    const el = uploadRef.current
    if (!el) return
    const enter = () => gsap.to(el, { scale: 1.02, borderColor: 'rgba(0,255,255,0.4)', duration: 0.3 })
    const leave = () => gsap.to(el, { scale: 1, borderColor: 'rgba(255,255,255,0.1)', duration: 0.3 })
    el.addEventListener('dragenter', enter)
    el.addEventListener('dragleave', leave)
    el.addEventListener('drop', leave)
    return () => { el.removeEventListener('dragenter', enter); el.removeEventListener('dragleave', leave); el.removeEventListener('drop', leave) }
  }, [step])

  function next() { setStep((s) => Math.min(4, s + 1) as Step) }
  function back() { setStep((s) => Math.max(1, s - 1) as Step) }

  async function generateMessage(selectedTone: string) {
    try {
      setRegenerating(true); setError(null)
      const data = await getFinalMessage(selectedTone)
      setmessage(data)
    } catch (e: any) { setError(e?.message || "Failed to regenerate message") }
    finally { setRegenerating(false) }
  }

  async function handleStep1() {
    try {
      setError(null); setLoading(true)
      const scrapedJob = await scrapeJobData(localStorage.getItem("userId") || "", url)
      if (scrapedJob?.companyName) setCompany(scrapedJob.companyName)
      next()
    }
    catch (e: any) { setError(e?.message || "Job scraping failed") }
    finally { setLoading(false) }
  }

  async function handleStep2() {
    try { setError(null); setLoading(true); if (resumeFile) { await extractResumeData(resumeFile); await combineJobandResume() }; next() }
    catch (e: any) { setError(e?.message || "Resume upload failed") }
    finally { setLoading(false) }
  }

  async function handleStep3() {
    try { setError(null); setLoading(true); const msg = await getFinalMessage(tone); setmessage(msg); next() }
    catch (e: any) { setError(e?.message || "Failed to combine resume and job") }
    finally { setLoading(false) }
  }

  console.log(message, "message is present")

  async function finish() {
    try {
      setError(null); setLoading(true)
      const messageId = localStorage.getItem("messageId")
      if (!messageId) throw new Error("Generate a message before starting outreach")
      if (!message.trim()) throw new Error("Message cannot be empty")

      await updateOutreachMessage(messageId, message)

      const workflow = await createAndTriggerWorkflow({
        name: `Outreach - ${company || "Job application"}`,
        targetCompany: company || "Outreach",
        cronExpression: "0 9 * * *",
        maxConnections: 10,
        outReachFlag: true,
        messageId,
      })
      const payload: Omit<Job, "id" | "createdAt"> = {
        url, company: company || "Unknown Company", title: title || "Unknown Role",
        targetRoles, tone, preview, status, candidates: initialJob?.candidates ?? [],
      }
      if (isEditing) { onUpdate(payload) } else { onCreate(payload) }
      onWorkflowCreated({ id: workflow?.id, name: workflow?.name || `Outreach - ${company || "Job application"}` })
    } catch (e: any) { setError(e?.message || "Message generation failed") }
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-4 mb-4">
        <CardTitle className="text-lg md:text-xl">Add Job</CardTitle>
      </CardHeader>
      <CardContent className="px-4 text-white">
        {error && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
        )}

        <div ref={stepRef}>
          {step === 1 && (
            <div className="space-y-4">
              <Label>1. Paste job URL</Label>
              <Input placeholder="https://company.com/careers/software-engineer" value={url} onChange={(e) => setUrl(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={handleStep1} disabled={loading}>{loading ? "Scraping..." : "Continue"}</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Label>2. Upload resume</Label>
              <label ref={uploadRef} htmlFor="resume" className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors px-4 py-6">
                <div className="flex items-center gap-3 text-white">
                  <div className="size-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><Upload className="size-5" /></div>
                  <div className="text-sm">
                    <div className="font-semibold text-white">{fileName ?? "Select configuration .PDF"}</div>
                    <div className="text-cyan-400/70 text-xs mt-0.5">PDF, DOCX supported</div>
                  </div>
                </div>
                <Button variant="outline" type="button" className="rounded-full shadow-[0_0_10px_rgba(0,255,255,0.1)]">Browse</Button>
              </label>
              <input id="resume" type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setResumeFile(file); setFileName(file.name) } }} />
              <div className="flex justify-between">
                <Button variant="outline" onClick={back}>Back</Button>
                <Button onClick={handleStep2} disabled={loading}>{loading ? "Uploading..." : "Continue"}</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Label>3. Configure outreach</Label>
              <Select value={tone} onValueChange={(v) => setTone(v)}>
                <SelectTrigger><SelectValue placeholder="Choose tone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Warm">Warm</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex justify-between">
                <Button variant="outline" onClick={back}>Back</Button>
                <Button onClick={handleStep3} disabled={loading}>{loading ? "Analyzing..." : "Continue"}</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <Label>4. Preview &amp; Edit</Label>
              <div className="relative">
                <Textarea rows={6} value={message} onChange={(e) => setmessage(e.target.value)} placeholder="Your generated message will appear here." className="pr-12 resize-none" />
                <button type="button" onClick={() => setShowTonePicker(!showTonePicker)} disabled={regenerating}
                  className="absolute right-3 bottom-3 flex items-center justify-center size-8 rounded-lg bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 hover:from-cyan-500/30 hover:to-indigo-500/30 hover:border-cyan-400/50 hover:text-cyan-300 hover:shadow-[0_0_12px_rgba(0,255,255,0.3)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Regenerate with AI"
                >
                  {regenerating ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                </button>
                <AnimatePresence>
                  {showTonePicker && (
                    <motion.div initial={{ opacity: 0, y: 4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.95 }} transition={{ duration: 0.15 }}
                      className="absolute right-0 bottom-14 z-50 w-52 rounded-xl border border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-2"
                    >
                      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">Select tone</div>
                      {["Warm", "Professional", "Casual"].map((t) => (
                        <button key={t} type="button"
                          onClick={() => { setTone(t); setShowTonePicker(false); generateMessage(t) }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 ${tone === t ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" : "text-neutral-300 hover:bg-white/5 hover:text-white border border-transparent"}`}
                        >{t}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={back}>Back</Button>
                <Button onClick={finish} disabled={loading || regenerating}>{loading ? "Sending..." : "Finish"}</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}