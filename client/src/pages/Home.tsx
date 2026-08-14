import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, Network, Sparkles, CheckCircle2, Star, Zap, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [showTooltip, setShowTooltip] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const bentoRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // ── GSAP Master Timeline ──
  useLayoutEffect(() => {
    if (!mainRef.current) return

    const ctx = gsap.context(() => {
      // Hero cinematic entrance
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      heroTl.fromTo('.hero-badge-main', { autoAlpha: 0, scale: 0.9, y: 15 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.6 })
      heroTl.fromTo('.hero-title-main', { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.9 }, '-=0.3')
      heroTl.fromTo('.hero-desc-main', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.4')
      heroTl.fromTo('.hero-cta-main', { autoAlpha: 0, y: 25 }, { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.5 }, '-=0.3')

      // Bento cards ScrollTrigger stagger
      const bentoCards = gsap.utils.toArray('.bento-card')
      gsap.fromTo(bentoCards,
        { autoAlpha: 0, y: 60, scale: 0.95 },
        {
          autoAlpha: 1, y: 0, scale: 1, stagger: 0.12, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: bentoRef.current, start: 'top 82%' }
        }
      )

      // Hero image parallax
      gsap.fromTo('.hero-image-main',
        { y: 0, scale: 1 },
        { y: -80, scale: 1.05, scrollTrigger: { trigger: '.hero-image-main', start: 'top 80%', end: 'bottom 20%', scrub: 1 } }
      )

      // Progress bar scrub
      gsap.fromTo('.bento-progress',
        { width: '0%' },
        {
          width: '100%', duration: 1,
          scrollTrigger: { trigger: '.bento-progress', start: 'top 90%', end: 'top 50%', scrub: 1 }
        }
      )

      // Logo wall marquee
      if (logoRef.current) {
        const track = logoRef.current.querySelector('.marquee-track')
        if (track) {
          gsap.to(track, { xPercent: -50, duration: 20, repeat: -1, ease: 'none' })
        }
      }

      // Features section
      gsap.fromTo('.features-heading',
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, duration: 0.7, scrollTrigger: { trigger: '.features-heading', start: 'top 85%' } }
      )
      const featureCards = gsap.utils.toArray('.feature-card')
      gsap.fromTo(featureCards,
        { autoAlpha: 0, y: 50, scale: 0.9 },
        {
          autoAlpha: 1, y: 0, scale: 1, stagger: 0.12, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: featuresRef.current, start: 'top 78%' }
        }
      )

      // Testimonials
      gsap.fromTo('.testimonial-heading',
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, duration: 0.7, scrollTrigger: { trigger: '.testimonial-heading', start: 'top 85%' } }
      )
      const testimonialCards = gsap.utils.toArray('.testimonial-card')
      gsap.fromTo(testimonialCards,
        { autoAlpha: 0, y: 50 },
        {
          autoAlpha: 1, y: 0, stagger: 0.15, duration: 0.6,
          scrollTrigger: { trigger: testimonialsRef.current, start: 'top 80%' }
        }
      )

      // Final CTA parallax + scale
      gsap.fromTo('.final-cta-box',
        { autoAlpha: 0, scale: 0.92 },
        {
          autoAlpha: 1, scale: 1, duration: 0.8,
          scrollTrigger: { trigger: ctaRef.current, start: 'top 85%' }
        }
      )
      gsap.fromTo('.final-cta-glow',
        { scale: 0.5, autoAlpha: 0 },
        {
          scale: 1, autoAlpha: 1,
          scrollTrigger: { trigger: ctaRef.current, start: 'top 90%', end: 'top 40%', scrub: true }
        }
      )
    }, mainRef.current)

    return () => ctx.revert()
  }, [])

  const handleUnauthorizedClick = (e: React.MouseEvent) => {
    if (!sessionStorage.getItem("authToken")) {
      e.preventDefault()
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 3000)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

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

  const logos = ['Meta', 'Amazon', 'Netflix', 'Google', 'Microsoft']

  return (
    <div className="relative min-h-screen bg-[#000000] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
      
      {/* Atmospheric Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full bg-[radial-gradient(circle,rgba(0,255,255,0.06),transparent_70%)] blur-3xl opacity-50" />
        <div className="absolute top-[20%] right-[-10%] w-[1000px] h-[1000px] rounded-full bg-[radial-gradient(circle,rgba(143,0,255,0.05),transparent_70%)] blur-3xl opacity-50" />
        <div className="absolute bottom-[-20%] left-[20%] w-[1200px] h-[1200px] rounded-full bg-[radial-gradient(circle,rgba(0,200,255,0.04),transparent_70%)] blur-3xl opacity-50" />
        <div 
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
            transform: `translate(${mousePosition.x * -0.01}px, ${mousePosition.y * -0.01}px)`
          }}
        />
      </div>

      <SiteHeader />

      <main ref={mainRef} className="relative z-10 w-full pt-32 pb-8">
        {/* HERO */}
        <div className="container mx-auto px-4 max-w-7xl">
          <div ref={heroRef} className="text-center max-w-4xl mx-auto mb-8">
            <div className="hero-badge-main gsap-reveal inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-sm font-medium mb-6 backdrop-blur-md">
              <Sparkles className="size-4" /> Announcing Autoreferral AI
            </div>
            <h1 className="hero-title-main gsap-reveal text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
              Efficiency and Productivity<br />with Our <span className="relative inline-block pb-2">
                <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 text-transparent bg-clip-text">SaaS Solution</span>
                <span className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full blur-[2px] opacity-70"></span>
              </span>
            </h1>
            <p className="hero-desc-main gsap-reveal text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Automate your LinkedIn outreach, match with precision, and instantly connect with key decision-makers using perfectly orchestrated AI pipelines.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8 relative">
              <div className="hero-cta-main gsap-reveal relative z-20">
                <AnimatePresence>
                  {showTooltip && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute -top-16 left-1/2 -translate-x-1/2 bg-[#050505] border border-cyan-500/50 text-cyan-400 px-4 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_30px_rgba(0,255,255,0.4)] whitespace-nowrap flex items-center gap-2"
                    >
                      Step 1: Connect LinkedIn to Start <ArrowRight className="size-4 rotate-90" />
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-solid border-t-[#050505] border-t-[8px] border-x-transparent border-x-[8px] border-b-0 drop-shadow-[0_4px_4px_rgba(0,255,255,0.2)]" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button size="lg" onClick={ConnectLinkedInButton} className="rounded-full px-8 bg-gradient-to-r from-[#0a66c2] to-[#004182] hover:scale-105 text-white h-14 text-base font-bold shadow-[0_0_40px_rgba(10,102,194,0.6)] border border-[#0a66c2]/50 transition-all relative group overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <svg className="mr-3 h-5 w-5 fill-current relative z-10" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span className="relative z-10">Connect LinkedIn to Start</span>
                </Button>
              </div>
              <div className="hero-cta-main gsap-reveal hidden sm:block w-px h-8 bg-white/20" />
              <Button asChild size="lg" variant="outline" className="hero-cta-main gsap-reveal rounded-full px-8 bg-transparent text-neutral-300 border-white/20 hover:text-white hover:bg-white/10 h-14 text-base font-semibold transition-colors">
                <Link to={sessionStorage.getItem("authToken") ? `/dashboard` : `#`} onClick={handleUnauthorizedClick}>
                  Go to Dashboard <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>
            </div>
          </div>

         
          {/* <div className="relative w-full max-w-5xl mx-auto mt-4 mb-8">
            <div className="hero-image-main gsap-reveal relative rounded-[32px] overflow-hidden border border-white/10 shadow-[0_20px_80px_rgba(0,255,255,0.08)]">
              <img src="/images/hero-network.png" alt="AI Network Visualization" className="w-full h-auto object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent opacity-60" />
            </div>
          </div> */}

          {/* BENTO GRID */}
          <div ref={bentoRef} className="w-full max-w-6xl mx-auto ">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px]">
              <div className="bento-card gsap-reveal md:col-span-2 rounded-[32px] border border-white/5 bg-[#030712]/60 backdrop-blur-3xl p-8 relative overflow-hidden shadow-2xl group flex flex-col justify-between">
                <div className="absolute right-0 top-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px]" />
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1 tracking-tight">Outreach Overview</h3>
                    <p className="text-sm text-neutral-400">Monthly connection volume</p>
                  </div>
                  <div className="bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 text-xs font-medium text-cyan-400 flex items-center gap-1.5">
                    <Activity className="size-3" /> +142% Active
                  </div>
                </div>
                <div className="relative z-10 mt-auto flex items-end justify-between border-t border-white/10 pt-6">
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`size-10 rounded-full border-2 border-[#030712] relative overflow-hidden bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-xs font-bold`}>#{i}</div>
                    ))}
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-xs text-neutral-500 mb-1 tracking-widest uppercase">Total Sent</p>
                      <p className="text-3xl font-semibold">373+</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 mb-1 tracking-widest uppercase">Conversion</p>
                      <p className="text-3xl font-semibold text-cyan-400">73%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bento-card gsap-reveal rounded-[32px] border border-white/5 bg-gradient-to-br from-[#131722]/80 to-[#030712]/80 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 p-6 opacity-30">
                  <Zap className="size-24 text-indigo-400" strokeWidth={1} />
                </div>
                <div className="relative z-10">
                  <div className="size-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
                    <Bot className="size-6" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2 tracking-tight">AI Personas</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">Deploy highly calibrated digital avatars that match connection queries instantly.</p>
                </div>
                <div className="mt-auto relative z-10 w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="bento-progress h-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: '0%' }} />
                </div>
              </div>

              <div className="bento-card gsap-reveal rounded-[32px] border border-white/5 bg-[#030712]/60 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center">
                <img src="/images/ai-orb.png" alt="AI" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="size-16 rounded-full border border-white/10 flex items-center justify-center shrink-0">
                    <Network className="size-7 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Target Node Found</p>
                    <p className="text-xs text-neutral-400">Senior Engineer • Microsoft</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-cyan-400">
                  <CheckCircle2 className="size-4" /> Message Delivered
                </div>
              </div>

              <div className="bento-card gsap-reveal md:col-span-2 rounded-[32px] border border-white/5 bg-gradient-to-br from-[#0a0a0a]/80 to-[#111111]/80 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden">
                <img src="/images/security-shield.png" alt="Security" className="absolute right-0 top-0 w-[280px] h-[280px] object-contain opacity-15 pointer-events-none" />
                <div className="relative z-10 mt-4 flex justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Share only when you are ready</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed max-w-sm">Absolute privacy controls over your resume and LinkedIn connection details.</p>
                  </div>
                  <div className="w-[120px] h-[120px] rounded-full border-[15px] border-cyan-500 bg-cyan-500/20 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs text-cyan-400">SECURE</span>
                    <span className="font-bold">100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOGO WALL MARQUEE */}
        <div ref={logoRef} className="mt-8 w-full border-y border-white/5 bg-[#000000]/50 backdrop-blur-md py-10 relative z-10 overflow-hidden">
          <div className="marquee-track">
            {[...logos, ...logos].map((logo, i) => (
              <div key={`${logo}-${i}`} className="flex items-center gap-2 font-bold text-xl tracking-tighter mx-12 opacity-40 hover:opacity-80 transition-opacity shrink-0">
                <Network className="size-6" /> {logo}
              </div>
            ))}
          </div>
        </div>

        {/* FEATURES */}
        <div ref={featuresRef} className="container mx-auto px-4 mt-8 max-w-6xl relative z-10">
          {/* <div className="features-heading gsap-reveal">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">New Platform Features</h2>
            <p className="text-neutral-400 max-w-2xl text-lg">We actively monitor real-time node pipelines to automatically assign connections, increasing accuracy.</p>
          </div> */}
          {/* <div className="relative w-full max-w-4xl mx-auto mb-12 rounded-[32px] overflow-hidden border border-white/5 shadow-[0_20px_60px_rgba(143,0,255,0.06)]">
            <img src="/images/feature-workflow.png" alt="Workflow Pipeline" className="w-full h-auto object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent opacity-70" />
          </div> */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="feature-card gsap-reveal rounded-[32px] border border-white/5 bg-[#080808] p-8 hover:bg-[#0c0c0c] transition-colors shadow-xl group">
              <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bot className="size-6 text-neutral-300" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">Seamless Workflow</h3>
              <p className="text-neutral-400 leading-relaxed text-sm">Automate everything natively. Deploy personas and let our engines target HR decision makers.</p>
            </div>
            <div className="feature-card gsap-reveal rounded-[32px] border border-white/5 bg-gradient-to-b from-[#180A2B] to-[#080808] p-8 shadow-[0_0_30px_rgba(143,0,255,0.1)] group">
              <div className="size-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
                <Activity className="size-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">Intuitive Interfaces</h3>
              <p className="text-neutral-300 leading-relaxed text-sm">Track real-time telemetry from connection to interview. Our glassmorphic dashboard is built for absolute clarity.</p>
            </div>
            <div className="feature-card gsap-reveal rounded-[32px] border border-white/5 bg-[#080808] p-8 hover:bg-[#0c0c0c] transition-colors shadow-xl group">
              <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Network className="size-6 text-neutral-300" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">Real-time Connection</h3>
              <p className="text-neutral-400 leading-relaxed text-sm">Collaborate automatically with our network scripts. See connection requests dispatched live on your dashboard.</p>
            </div>
          </div>
        </div>

        {/* TESTIMONIALS */}
        <div ref={testimonialsRef} className="container mx-auto px-4 mt-8 max-w-6xl relative z-10">
          <div className="testimonial-heading gsap-reveal text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">What our clients say about us</h2>
            <p className="text-neutral-400 max-w-xl mx-auto">See the impact of true automation. Over 50+ interview offers unlocked this quarter.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="testimonial-card gsap-reveal rounded-[32px] border border-white/5 bg-[#050505]/80 backdrop-blur-xl p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="size-12 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 p-[2px]">
                    <div className="w-full h-full bg-[#030712] rounded-full flex items-center justify-center text-xs font-bold text-white">User</div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white tracking-tight">Software Engineer</p>
                    <div className="flex text-yellow-500 mt-1">
                      <Star className="size-3 fill-current" /><Star className="size-3 fill-current" /><Star className="size-3 fill-current" /><Star className="size-3 fill-current" /><Star className="size-3 fill-current" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed italic">
                  "This solution practically automated my entire job hunt. The UI is stunning and the actual background engine is flawless. Secured a role within 3 weeks."
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FINAL CTA */}
        <div ref={ctaRef} className="container mx-auto px-4 mt-40 mb-20 max-w-6xl relative z-10">
          <div className="final-cta-box gsap-reveal rounded-[40px] border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#000000] p-12 md:p-20 flex flex-col md:flex-row items-center justify-between overflow-hidden relative shadow-[0_0_100px_rgba(0,255,255,0.05)]">
            <div className="final-cta-glow absolute right-0 top-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            <div className="relative z-10 max-w-xl mb-10 md:mb-0">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-white leading-[1.1]">Get started with SaaS Solution.</h2>
              <p className="text-neutral-400 text-lg">Join 1000+ developers automating their career growth.</p>
            </div>
            <div className="relative z-10 w-full md:w-auto">
              <Button asChild size="lg" className="w-full md:w-auto rounded-[32px] px-10 bg-gradient-to-r from-cyan-500 to-[#1090d0] hover:scale-105 transition-transform duration-300 text-white h-16 text-lg font-bold shadow-[0_0_40px_rgba(0,255,255,0.4)] relative group">
                <Link to={sessionStorage.getItem("authToken") ? `/dashboard` : `#`} onClick={handleUnauthorizedClick}>
                  Get Started Now
                </Link>
              </Button>
            </div>
          </div>
          <div className="w-full text-center mt-8 mb-4 opacity-50 text-sm flex flex-wrap justify-center gap-8 px-4">
            <Link to="#" className="hover:text-cyan-400 transition-colors">Features</Link>
            <Link to="#" className="hover:text-cyan-400 transition-colors">Pricing</Link>
            <Link to="#" className="hover:text-cyan-400 transition-colors">About Us</Link>
            <Link to="#" className="hover:text-cyan-400 transition-colors">Contact</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
