import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Link } from "react-router-dom"
import { Sparkles, ArrowRight, Rocket, BrainCircuit, Target } from 'lucide-react'
import { gsap } from '@/lib/gsap'

type HeroProps = {
  ctaHref?: string
}

export function Hero({ ctaHref = '/dashboard' }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  function ConnectLinkedInButton() {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: import.meta.env.VITE_LINKEDIN_CLIENT_ID || "",
      redirect_uri: import.meta.env.VITE_LINKEDIN_REDIRECT_URI || "http://localhost:8000/dashboard",
      state: crypto.randomUUID(),
      scope: "openid profile email w_member_social"
    })
    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?${params}`
  }

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      // Badge pill entrance
      tl.fromTo('.hero-badge', { autoAlpha: 0, scale: 0.9, y: 10 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.5 })

      // Heading words stagger
      tl.fromTo('.hero-heading', { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.8 }, '-=0.2')

      // Subtitle
      tl.fromTo('.hero-subtitle', { autoAlpha: 0, y: 25 }, { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.4')

      // Feature pills stagger
      tl.fromTo('.hero-pill', { autoAlpha: 0, y: 15, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.4 }, '-=0.3')

      // CTA buttons
      tl.fromTo('.hero-cta', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.5 }, '-=0.2')

      // Floating images
      gsap.to('.hero-float-left', { y: -30, rotation: 5, duration: 15, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.hero-float-right', { y: 40, rotation: -5, duration: 18, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1 })

      // Mouse parallax glow
      const xTo = gsap.quickTo('.hero-glow', 'x', { duration: 0.8, ease: 'power3.out' })
      const yTo = gsap.quickTo('.hero-glow', 'y', { duration: 0.8, ease: 'power3.out' })

      const handleMove = (e: MouseEvent) => {
        const cx = e.clientX - window.innerWidth / 2
        const cy = e.clientY - window.innerHeight / 2
        xTo(cx * -0.05)
        yTo(cy * -0.05)
      }
      window.addEventListener('mousemove', handleMove)

      return () => window.removeEventListener('mousemove', handleMove)
    }, sectionRef.current)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative overflow-visible py-14 md:py-24 perspective-container">
      <div className="mx-auto max-w-3xl text-center relative z-10">
        <div className="hero-badge gsap-reveal inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-3 py-1 text-xs text-neutral-300 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
          <Sparkles className="size-3.5 text-cyan-400" />
          <span>AI-Powered Outreach</span>
          <Button size="sm" onClick={ConnectLinkedInButton} className="h-6 rounded-full ml-2 text-[10px] px-3">
            Connect with LinkedIn
          </Button>
        </div>

        <h1 className="hero-heading gsap-reveal mt-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
          {'Automated LinkedIn Referrals.'}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">One Click Away</span>
        </h1>

        <p className="hero-subtitle gsap-reveal mx-auto mt-6 max-w-xl text-neutral-400 text-lg">
          Paste a job or company URL, let AI find the best employees, and auto-generate personalized messages.
        </p>
        
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-cyan-400">
          <span className="hero-pill gsap-reveal flex items-center gap-2 border border-white/5 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full shadow-[0_0_10px_rgba(0,255,255,0.1)]"><Rocket className="size-3.5" /> 10x Interview Rate</span>
          <span className="hero-pill gsap-reveal flex items-center gap-2 border border-white/5 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full shadow-[0_0_10px_rgba(143,0,255,0.1)] text-purple-400"><BrainCircuit className="size-3.5" /> AI Persona Calibration</span>
          <span className="hero-pill gsap-reveal flex items-center gap-2 border border-white/5 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full shadow-[0_0_10px_rgba(0,255,255,0.1)]"><Target className="size-3.5" /> Autonomous Outreach</span>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="lg" className="hero-cta gsap-reveal gap-2 rounded-full shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_40px_rgba(0,255,255,0.5)]">
            <Link to={sessionStorage.getItem("authToken") ? ctaHref : "#"} onClick={(e) => {
              if (!sessionStorage.getItem("authToken")) {
                e.preventDefault()
                alert("User needs to Logged IN")
              }
            }}>
              Get Started <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="hero-cta gsap-reveal rounded-full">
            <a href="#how-it-works">How it works</a>
          </Button>
        </div>
      </div>

      <div className="hero-float-left pointer-events-none absolute left-[5%] top-[10%] opacity-40 mix-blend-screen hidden md:block">
        <img src="/assets/network-nodes.png" alt="AI Network" className="w-[400px] h-[400px] object-contain drop-shadow-[0_0_30px_rgba(0,255,255,0.6)]" />
      </div>

      <div className="hero-float-right pointer-events-none absolute right-[5%] bottom-[10%] opacity-30 mix-blend-screen hidden md:block">
        <img src="/assets/network-nodes.png" alt="AI Network" className="w-[300px] h-[300px] object-contain drop-shadow-[0_0_30px_rgba(143,0,255,0.6)]" />
      </div>

      <div ref={glowRef} className="hero-glow pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[650px] rounded-full bg-gradient-to-tr from-cyan-500/15 to-indigo-500/15 blur-[120px]" />
    </section>
  )
}
