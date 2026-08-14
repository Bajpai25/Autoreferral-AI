import { useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListOrdered, LinkIcon, Bot, Send } from 'lucide-react'
import { gsap, ScrollTrigger } from '@/lib/gsap'

type HowItWorksProps = {
  id?: string
}

export function HowItWorks({ id = 'how-it-works' }: HowItWorksProps) {
  const sectionRef = useRef<HTMLElement>(null)

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

  useEffect(() => {
    if (!sectionRef.current) return

    const cards = sectionRef.current.querySelectorAll('.hiw-card')
    const heading = sectionRef.current.querySelector('.hiw-heading')

    const ctx = gsap.context(() => {
      if (heading) {
        gsap.fromTo(heading,
          { autoAlpha: 0, y: 40 },
          {
            autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out',
            scrollTrigger: { trigger: heading, start: 'top 88%', toggleActions: 'play none none none' }
          }
        )
      }

      gsap.fromTo(cards,
        { autoAlpha: 0, y: 50, scale: 0.92 },
        {
          autoAlpha: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none none' }
        }
      )
    }, sectionRef.current)

    return () => ctx.revert()
  }, [])

  return (
    <section id={id} className="mt-12 md:mt-16" ref={sectionRef}>
      <h2 className="hiw-heading gsap-reveal text-2xl md:text-3xl font-semibold tracking-tight">How It Works</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.title} className="hiw-card gsap-reveal">
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
          </div>
        ))}
      </div>
    </section>
  )
}
