import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListOrdered, LinkIcon, Bot, Send } from 'lucide-react'

type HowItWorksProps = {
  id?: string
}

export function HowItWorks({ id = 'how-it-works' }: HowItWorksProps) {
  const steps = [
    {
      icon: LinkIcon,
      title: 'Paste a job or company URL',
      desc: 'Start with any public job or company page.',
    },
    {
      icon: Bot,
      title: 'Let AI find the best employees',
      desc: 'We surface people who can refer you internally.',
    },
    {
      icon: Send,
      title: 'Auto-generate and send messages',
      desc: 'Preview, personalize, and send in minutes.',
    },
  ]
  return (
    <section id={id} className="mt-12 md:mt-16">
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">How It Works</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Card>
              <CardHeader className="flex-row items-center gap-3">
                <div className="rounded-md border p-2">
                  <s.icon className="size-5" />
                </div>
                <CardTitle className="text-base">{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-neutral-600">
                {s.desc}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
