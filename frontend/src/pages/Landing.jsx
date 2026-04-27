import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, Avatar, AvatarGroup, Chip } from "@nextui-org/react";
import {
  Zap,
  BarChart3,
  Users,
  Star,
  ArrowRight,
  CheckCircle2,
  Shield,
  LayoutDashboard,
  Brain,
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import Logo from '../components/Logo';

// Global Animation Variants
const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100, damping: 30, restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">

      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary z-[100] origin-left"
        style={{ scaleX }}
      />

      {/* Sticky Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between border-b border-divider/50 bg-background/80 px-6 py-4 backdrop-blur-xl md:px-12 transition-all duration-300">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-extrabold text-xl tracking-tight leading-none h-full pt-1">Tecno<span className="text-primary">Legacy</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-default-600">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
          <a href="#benefits" className="hover:text-primary transition-colors">Benefits</a>
          <a href="#testimonials" className="hover:text-primary transition-colors">Testimonials</a>
        </div>
        <div className="flex items-center gap-4">
          <Button as={Link} to="/login" variant="light" className="hidden sm:flex font-semibold">
            Log In
          </Button>
          <Button as={Link} to="/register" color="primary" radius="full" className="font-semibold px-6 shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-transform">
            Start Free Trial
          </Button>
        </div>
      </nav>

      {/* 1. Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 lg:px-20 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Dynamic Background Mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2], translate: ['0%', '10%', '0%'] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-[10%] -right-[10%] w-[40%] h-[60%] rounded-full bg-secondary/20 blur-[100px]"
          />
        </div>

        <motion.div
          variants={staggerContainer} initial="hidden" animate="visible"
          className="max-w-4xl z-10"
        >
          <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm mb-8">
            <SparklesIcon /> Introducing Version 2.0
          </motion.div>

          <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/70 mb-8 leading-[1.1]">
            Hire Smarter with <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">AI-Powered ATS</span>
          </motion.h1>

          <motion.p variants={fadeIn} className="text-lg md:text-xl text-default-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Eliminate bias, automate resume parsing, and rank candidates instantly. Transform your hiring workflow from chaos to clarity in minutes.
          </motion.p>

          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button as={Link} to="/register" color="primary" size="lg" radius="full" endContent={<ArrowRight size={18} />} className="w-full sm:w-auto px-8 font-bold text-md shadow-xl shadow-primary/30">
              Start Hiring Today
            </Button>
            <Button as={Link} to="#" variant="bordered" size="lg" radius="full" className="w-full sm:w-auto px-8 font-bold text-md border-divider hover:bg-content2">
              Book a Demo
            </Button>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-10 flex items-center justify-center gap-4 text-sm text-default-500">
            <div className="flex items-center gap-1"><CheckCircle2 size={16} className="text-success" /> No credit card required</div>
            <div className="flex items-center gap-1"><CheckCircle2 size={16} className="text-success" /> 14-day free trial</div>
          </motion.div>
        </motion.div>
      </section>

      {/* 4. Dashboard Preview Section */}
      <section className="relative px-4 lg:px-20 max-w-7xl mx-auto mb-32 -mt-10 z-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, type: "spring" }}
          className="relative rounded-3xl p-2 bg-gradient-to-b from-divider to-transparent shadow-2xl shadow-primary/10 isolate"
        >
          <div className="absolute inset-0 -z-10 rounded-3xl bg-background/40 backdrop-blur-xl" />

          <div className="rounded-[22px] bg-content1 border border-divider/50 overflow-hidden relative">
            {/* Mock Mac Header */}
            <div className="h-12 bg-content2/50 border-b border-divider/50 flex items-center px-4 gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-danger/80" />
                <div className="w-3 h-3 rounded-full bg-warning/80" />
                <div className="w-3 h-3 rounded-full bg-success/80" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg bg-content3/50 text-xs text-default-500 font-mono tracking-widest flex items-center gap-2">
                <Shield size={12} /> app.tecnolegacy.com
              </div>
            </div>

            {/* Application Mock */}
            <div className="grid grid-cols-12 gap-6 p-6 h-[500px] bg-background">
              {/* Sidebar Mock */}
              <div className="col-span-3 hidden md:flex flex-col gap-4">
                <div className="h-8 w-24 bg-default-200 rounded-lg mb-4" />
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`h-10 w-full rounded-xl ${i === 2 ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-default-100'} flex items-center px-4 gap-3`}>
                    <div className={`w-4 h-4 rounded ${i === 2 ? 'bg-primary' : 'bg-default-300'}`} />
                    <div className={`h-2 w-16 rounded-full ${i === 2 ? 'bg-primary' : 'bg-default-300'}`} />
                  </div>
                ))}
              </div>

              {/* Main Content Mock */}
              <div className="col-span-12 md:col-span-9 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold">Candidates</h3>
                    <p className="text-default-500 text-sm mt-1">Reviewing 24 new applicants</p>
                  </div>
                  <Button color="primary" size="sm" radius="full">Add Candidate</Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { val: "24", label: "New Applied", cl: "text-blue-500" },
                    { val: "12", label: "Shortlisted", cl: "text-success-500" },
                    { val: "5", label: "Interviews", cl: "text-warning-500" }
                  ].map((stat, i) => (
                    <Card key={i} className="shadow-none border border-divider">
                      <CardBody className="p-4">
                        <p className="text-default-500 text-xs font-bold uppercase">{stat.label}</p>
                        <p className={`text-3xl font-extrabold mt-1 ${stat.cl}`}>{stat.val}</p>
                      </CardBody>
                    </Card>
                  ))}
                </div>

                {/* Table Mock */}
                <Card className="shadow-none border border-divider flex-1">
                  <div className="flex items-center gap-4 p-4 border-b border-divider">
                    <Avatar src="https://i.pravatar.cc/150?u=a0425" />
                    <div className="flex-1">
                      <h4 className="font-bold">Sarah Jenkins</h4>
                      <p className="text-xs text-default-500">Senior Frontend Developer</p>
                    </div>
                    <div className="text-right">
                      <Chip color="success" variant="flat" size="sm" className="font-bold">98% Match</Chip>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 opacity-50">
                    <Avatar src="https://i.pravatar.cc/150?u=a0428" />
                    <div className="flex-1">
                      <h4 className="font-bold">Michael Chen</h4>
                      <p className="text-xs text-default-500">Full Stack Engineer</p>
                    </div>
                    <div className="text-right">
                      <Chip color="warning" variant="flat" size="sm" className="font-bold">85% Match</Chip>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 2. Features Section */}
      <section id="features" className="py-24 bg-content1 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-3">Power Features</h2>
            <h3 className="text-3xl md:text-5xl font-bold mb-6">Everything you need to hire top-tier talent.</h3>
            <p className="text-default-600 text-lg">Our comprehensive suite of tools replaces your cluttered spreadsheet and accelerates your hiring funnel.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Brain className="text-primary" size={24} />,
                title: "AI Resume Parsing",
                desc: "Automatically extract key skills, education, and experience from any PDF or Document instantly.",
              },
              {
                icon: <LayoutDashboard className="text-secondary" size={24} />,
                title: "Smart Ranking",
                desc: "Algorithms instantly match and rank applicants against your specific Job Descriptions.",
              },
              {
                icon: <Zap className="text-warning" size={24} />,
                title: "Automated Workflows",
                desc: "Send emails, trigger interviews, and move candidates between pipelines without manual work.",
              },
              {
                icon: <BarChart3 className="text-success" size={24} />,
                title: "Analytics Dashboard",
                desc: "Track time-to-hire, source quality, and bottleneck metrics all in one gorgeous visual dashboard.",
              },
              {
                icon: <Users className="text-danger" size={24} />,
                title: "Collaborative Hiring",
                desc: "Invite your entire team to leave notes, vote on candidates, and align on hiring decisions.",
              },
              {
                icon: <Shield className="text-primary" size={24} />,
                title: "Enterprise Security",
                desc: "Bank-scale encryption secures all candidate data with advanced robust backup systems.",
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className="bg-background border border-divider hover:border-primary/50 transition-colors group cursor-pointer shadow-sm hover:shadow-xl hover:shadow-primary/5" isHoverable>
                  <CardBody className="p-8">
                    <div className="w-14 h-14 rounded-2xl bg-default-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                      {feature.icon}
                    </div>
                    <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
                    <p className="text-default-500 leading-relaxed">{feature.desc}</p>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section id="how-it-works" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 text-center">
          <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-3">Workflow</h2>
          <h3 className="text-3xl md:text-4xl font-bold mb-16">Three steps to your next great hire.</h3>

          <div className="flex flex-col md:flex-row items-start justify-center gap-8 relative">
            <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-20" />

            {[
              { title: "Define the Role", desc: "Upload a job description outlining your ideal candidate.", step: "01" },
              { title: "AI Analyzes", desc: "Candidates submit resumes; our AI extracts and benchmarks them.", step: "02" },
              { title: "Hire the Best", desc: "Review auto-ranked lists, execute interviews, and finalize offers.", step: "03" }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.2 }}
                className="flex-1 relative z-10 w-full flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-full bg-background border-4 border-primary text-2xl font-black text-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                  {item.step}
                </div>
                <h4 className="text-2xl font-bold mb-3">{item.title}</h4>
                <p className="text-default-500 px-4">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Benefits Split Layout */}
      <section id="benefits" className="py-24 bg-content1 border-y border-divider">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">Focus on people, not paperwork.</h2>
            <p className="text-lg text-default-600">
              Manual resume screening steals thousands of hours from recruiters. By weaponizing artificial intelligence, you bypass the friction, locating exactly what you need in fractions of a second.
            </p>

            <div className="space-y-4">
              {[
                { icon: <TrendingUp className="text-success" />, text: "Reduce time-to-hire by 60%" },
                { icon: <Clock className="text-primary" />, text: "Save ~14 hours per week on manual review" },
                { icon: <Shield className="text-secondary" />, text: "Eliminate unconscious bias natively" }
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-background border border-divider shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-content2 flex items-center justify-center">
                    {benefit.icon}
                  </div>
                  <span className="font-semibold">{benefit.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Abstract Graphic Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative h-[500px] rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-divider flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 backdrop-blur-3xl" />
            <div className="relative z-10 flex flex-col gap-4">
              <Card className="w-72 shadow-2xl shadow-primary/20 bg-background/90 backdrop-blur-md translate-x-12">
                <CardBody className="p-5 flex flex-row items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-success p-1">
                    <Avatar src="https://i.pravatar.cc/150?u=a0425" className="w-full h-full" />
                  </div>
                  <div>
                    <p className="font-bold">Interview Ready</p>
                    <p className="text-xs text-default-500">Scheduled for Torus Corp.</p>
                  </div>
                </CardBody>
              </Card>
              <Card className="w-72 shadow-2xl shadow-secondary/20 bg-background/90 backdrop-blur-md -translate-x-12">
                <CardBody className="p-5 flex flex-row items-center gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">
                    AI
                  </div>
                  <div>
                    <p className="font-bold">Scanning 400 Resumes</p>
                    <div className="w-full h-2 bg-default-200 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-primary w-3/4 rounded-full" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 6. Testimonials */}
      <section id="testimonials" className="py-24 max-w-7xl mx-auto px-6 lg:px-20 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Loved by modern teams.</h2>
        <p className="text-lg text-default-500 mb-16 max-w-2xl mx-auto">Join thousands of recruiting leaders who have transformed their hiring pipeline with TecnoLegacy.</p>

        <div className="flex flex-col md:flex-row gap-6">
          {[
            {
              quote: "The auto-ranking algorithm entirely eliminated our initial screening phase. We hired a Senior Node Dev in essentially 4 days.",
              name: "Alexandra Ruiz",
              title: "VP of Engineering at TechNova",
              avatar: "https://i.pravatar.cc/150?u=12"
            },
            {
              quote: "A perfectly designed interface that doesn't feel like traditional corporate software. My recruiters actually enjoy logging in every morning.",
              name: "David Chen",
              title: "Head of Talent at Vertex",
              avatar: "https://i.pravatar.cc/150?u=33"
            },
            {
              quote: "The ability to have multiple hiring managers collaborate asynchronously on the same candidate profile is an absolute game-changer.",
              name: "Samantha Barnes",
              title: "HR Director at Synapse",
              avatar: "https://i.pravatar.cc/150?u=44"
            }
          ].map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className="flex-1 text-left"
            >
              <Card className="h-full bg-content1 border border-divider">
                <CardBody className="p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex gap-1 mb-6 text-warning">
                      {[1, 2, 3, 4, 5].map(star => <Star key={star} size={16} fill="currentColor" />)}
                    </div>
                    <p className="text-lg font-medium italic mb-8">"{testimonial.quote}"</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Avatar src={testimonial.avatar} />
                    <div>
                      <p className="font-bold">{testimonial.name}</p>
                      <p className="text-xs text-default-500">{testimonial.title}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Mock Company Logos */}
        {/* <div className="mt-20 pt-10 border-t border-divider opacity-50 flex flex-wrap justify-center gap-10 md:gap-20 grayscale">
           <span className="text-2xl font-black uppercase tracking-widest">Acme Corp</span>
           <span className="text-2xl font-black uppercase tracking-widest">GlobalBank</span>
           <span className="text-2xl font-black uppercase tracking-widest">Stark Ind.</span>
           <span className="text-2xl font-black uppercase tracking-widest">Umbrella</span>
        </div> */}
      </section>

      {/* 7. CTA Section */}
      <section className="py-24 px-4 w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto bg-gradient-to-br from-primary to-secondary rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-primary/20"
        >
          {/* Decorative Background */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />

          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6">Start building your dream team.</h2>
            <p className="text-primary-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              Join the future of recruitment. Sign up today and get your first 14 days completely free.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button as={Link} to="/register" size="lg" radius="full" className="bg-white text-primary font-black px-10 shadow-xl w-full sm:w-auto h-14 hover:scale-105 transition-transform">
                Start Free Trial
              </Button>
              <Button as={Link} to="/contact" size="lg" radius="full" variant="bordered" className="border-white/50 text-white font-bold px-10 w-full sm:w-auto h-14 hover:bg-white/10">
                Contact Sales
              </Button>
            </div>
            <p className="text-white/60 text-sm mt-6">No credit card required. Cancel anytime.</p>
          </div>
        </motion.div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-content1 border-t border-divider pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-extrabold text-2xl tracking-tight leading-none">Tecno<span className="text-primary">Legacy</span></span>
            </div>
            <p className="text-default-500 max-w-xs">
              AI-Powered applicant tracking logic built for ambitious teams looking to hire faster safely.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-3 text-default-500 text-sm">
              <li><Link to="#" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Integrations</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Resources</h4>
            <ul className="space-y-3 text-default-500 text-sm">
              <li><Link to="#" className="hover:text-primary transition-colors">Documentation</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Community</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Guides</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-3 text-default-500 text-sm">
              <li><Link to="#" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Careers</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-20 pt-8 border-t border-divider flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-default-500">
          <p>© 2026 TecnoLegacy. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="#" className="hover:text-foreground transition-colors">Twitter</Link>
            <Link to="#" className="hover:text-foreground transition-colors">LinkedIn</Link>
            <Link to="#" className="hover:text-foreground transition-colors">GitHub</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

// Sparkle Icon Helper
function SparklesIcon(props) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}
