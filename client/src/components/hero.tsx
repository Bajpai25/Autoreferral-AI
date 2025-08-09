import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {Link} from "react-router-dom"
import { Sparkles, ArrowRight } from 'lucide-react'

type HeroProps = {
  ctaHref?: string
}

export function Hero({ ctaHref = '/dashboard' }: HeroProps) {
  return (
    <section className="relative overflow-hidden py-14 md:py-24">
      <motion.div
        className="mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-neutral-600 shadow-sm">
          <Sparkles className="size-3.5 text-neutral-700" />
          <span>AI-Powered Outreach</span>
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
          {'Automated LinkedIn Referrals.'}
          <br />
          {'One Click Away'}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-neutral-600">
          Paste a job or company URL, let AI find the best employees, and auto-generate personalized messages.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link to={ctaHref}>
              Get Started <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#how-it-works">How it works</a>
          </Button>
        </div>
      </motion.div>

      <motion.div
        className="pointer-events-none absolute -left-24 -top-24 size-[300px] rounded-full bg-neutral-200/40 blur-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      />
    </section>
  )
}
