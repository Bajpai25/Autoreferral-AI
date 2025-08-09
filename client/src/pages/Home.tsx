import { motion } from 'framer-motion'
import {Link} from "react-router-dom"
import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { HowItWorks } from '@/components/how-it-works'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900">
      <SiteHeader />
      <main className="container mx-auto px-4">
        <Hero />
        <HowItWorks />

        <section className="relative mt-16 rounded-2xl border bg-white p-6 md:p-10 shadow-sm">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className="space-y-4">
              <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">
                See your dashboard in action
              </h3>
              <p className="text-neutral-600">
                Add a job URL, let AI find the right employees, then preview and send outreach in minutes.
              </p>
              <div className="flex gap-3">
                <Button asChild className="gap-2">
                  <Link to="/dashboard">
                    Open Dashboard <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <a href="#how-it-works">Learn more</a>
                </Button>
              </div>
            </div>
            <motion.div
              className="relative rounded-xl border bg-neutral-50 overflow-hidden"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <img
                src="./wireframe.png"
                alt="Wireframe preview of the dashboard and settings"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </motion.div>
          </div>
        </section>

        <section className="mt-16">
          <motion.div
            className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl md:text-2xl font-semibold">Add Job</h3>
              <div className="flex gap-2">
                <span className="size-2 rounded-full bg-neutral-300" />
                <span className="size-2 rounded-full bg-neutral-300" />
                <span className="size-2 rounded-full bg-neutral-300" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-neutral-500">
                  <tr className="[&_th]:py-3 [&_th]:font-medium">
                    <th className="pr-3">Employee</th>
                    <th className="pr-3">Title</th>
                    <th className="pr-3">Status</th>
                    <th className="pr-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-3">John Doe, Google</td>
                    <td>Software Engineer</td>
                    <td>Connection Sent</td>
                    <td className="text-neutral-600">View Message</td>
                  </tr>
                  <tr>
                    <td className="py-3">Phya R., Google</td>
                    <td>Frontend Engineer</td>
                    <td>Message Sent</td>
                    <td className="text-neutral-600">View / Edit</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        </section>

        <section className="mt-16 text-center">
          <Button asChild size="lg" className="min-w-48">
            <Link to="/dashboard">Try the Dashboard</Link>
          </Button>
        </section>
      </main>
      <footer className="container mx-auto px-4 py-12 text-sm text-neutral-500">
        {'© '}{new Date().getFullYear()}{' AutoReferrals. All rights reserved.'}
      </footer>
    </div>
  )
}
