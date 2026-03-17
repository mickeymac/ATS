import { Link } from 'react-router-dom';
import { Button, Card, CardBody } from "@nextui-org/react";
import Logo from '../components/Logo';

export default function Landing() {
  return (
    <div className="min-h-screen bg-transparent text-default-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-divider/70 bg-content1/70 px-6 py-4 backdrop-blur-xl md:px-10">
        <Logo />
        <div className="hidden space-x-2 rounded-2xl border border-divider/70 bg-content2/70 p-1 md:flex">
          <a href="#features" className="rounded-xl px-4 py-2 text-sm text-default-600 transition hover:bg-content1 hover:text-default-900">Features</a>
          <a href="#how" className="rounded-xl px-4 py-2 text-sm text-default-600 transition hover:bg-content1 hover:text-default-900">How It Works</a>
        </div>
        <Button as={Link} to="/login" color="primary" radius="full" className="font-semibold shadow-sm">
          Get started
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 text-center md:px-20">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-secondary/15 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl rounded-3xl border border-divider/70 bg-content1/80 px-6 py-14 backdrop-blur-xl md:px-10">
          <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
            AI Recruiting Platform
          </span>
          <h2 className="mt-5 text-4xl font-extrabold leading-tight text-default-900 md:text-6xl">
            Hire Smarter.
            <br />
            Move Faster.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-default-600">
            AI-powered Applicant Tracking System that analyzes resumes,
            ranks candidates instantly, and helps you hire the best talent faster.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button color="primary" size="lg" radius="full" className="font-semibold shadow-sm">
              Watch Demo
            </Button>
            <Button as={Link} to="/login" variant="bordered" size="lg" radius="full" className="border-divider/80 bg-content2/40">
              Get started
            </Button>
          </div>
        </div>

        {/* Floating Cards */}
        <div className="relative mt-14 flex flex-col justify-center gap-5 md:flex-row md:gap-8">
          <Card className="surface-card w-full md:w-72">
            <CardBody className="p-6 text-center">
              <h3 className="font-bold text-default-900">Resume Score</h3>
              <p className="text-4xl font-extrabold text-success mt-2">92%</p>
              <p className="text-default-500 mt-2">Excellent Match</p>
            </CardBody>
          </Card>

          <Card className="surface-card w-full md:w-72">
            <CardBody className="p-6 text-center">
              <h3 className="font-bold text-default-900">Top Candidate</h3>
              <p className="mt-2 text-default-600">John Doe</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-default-200">
                <div className="h-2 w-4/5 rounded-full bg-primary" />
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 md:px-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-default-900">
          Everything You Need to Hire Better
        </h2>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "AI Resume Analysis",
              desc: "Automatically analyze resumes with intelligent skill matching and extraction.",
              color: "primary"
            },
            {
              title: "Smart Ranking",
              desc: "Instantly rank candidates based on job description match score.",
              color: "success"
            },
            {
              title: "Automated Shortlisting",
              desc: "Filter candidates by skills, experience, and custom criteria.",
              color: "warning"
            },
          ].map((feature, index) => (
            <Card 
              key={index} 
              className="surface-card transition-transform hover:-translate-y-1"
              isPressable
            >
              <CardBody className="p-8">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-${feature.color}/10`}>
                  <div className={`w-6 h-6 rounded-lg bg-${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-default-900">{feature.title}</h3>
                <p className="text-default-600 mt-4">{feature.desc}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="px-6 py-20 md:px-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-default-900">
          How It Works
        </h2>

        <div className="mt-14 grid gap-5 text-center md:grid-cols-4">
          {[
            "Upload Job Description", 
            "Upload Resumes", 
            "AI Analyzes & Scores", 
            "View Ranked Candidates"
          ].map((step, index) => (
            <Card key={index} className="surface-card">
              <CardBody className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  0{index + 1}
                </div>
                <p className="text-default-900 font-medium">{step}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 md:px-20">
        <Card className="border border-primary/30 bg-primary/90 text-primary-foreground">
          <CardBody className="p-12 text-center">
            <h2 className="text-3xl font-bold">Ready to transform your hiring?</h2>
            <p className="mt-4 opacity-80 max-w-xl mx-auto">
              Join thousands of companies using TecnoLegacy to find the best talent faster.
            </p>
            <Button as={Link} to="/register" color="default" size="lg" radius="full" className="mt-8 font-semibold">
              Start Free Trial
            </Button>
          </CardBody>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-default-900 text-default-100 text-center py-6">
        © 2026 TecnoLegacy. All rights reserved.
      </footer>
    </div>
  );
}
