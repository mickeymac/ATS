import { Link } from 'react-router-dom';
import { Button, Card, CardBody } from "@nextui-org/react";
import Logo from '../components/Logo';

export default function Landing() {
  return (
    <div className="bg-background text-default-900 min-h-screen">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 md:px-10 py-6 border-b border-divider">
        <Logo />
        <div className="space-x-8 hidden md:flex">
          <a href="#features" className="text-default-600 hover:text-default-900 transition">Features</a>
          <a href="#how" className="text-default-600 hover:text-default-900 transition">How It Works</a>
        </div>
        <Button as={Link} to="/login" color="primary" radius="full">
          Get started
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="text-center px-6 md:px-20 py-20 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-success/10 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <h2 className="text-4xl md:text-6xl font-extrabold leading-tight text-default-900">
            Hire Smarter. <br /> Screen Faster.
          </h2>
          <p className="mt-6 text-lg text-default-600 max-w-2xl mx-auto">
            AI-powered Applicant Tracking System that analyzes resumes,
            ranks candidates instantly, and helps you hire the best talent faster.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button color="primary" size="lg" radius="full">
              Watch Demo
            </Button>
            <Button as={Link} to="/login" variant="bordered" size="lg" radius="full">
              Get started
            </Button>
          </div>
        </div>

        {/* Floating Cards */}
        <div className="relative mt-20 flex flex-col md:flex-row justify-center gap-6 md:gap-10">
          <Card className="w-full md:w-64 transform rotate-0 md:rotate-6 border border-divider animate-bounce-slow">
            <CardBody className="p-6 text-center">
              <h3 className="font-bold text-default-900">Resume Score</h3>
              <p className="text-4xl font-extrabold text-success mt-2">92%</p>
              <p className="text-default-500 mt-2">Excellent Match</p>
            </CardBody>
          </Card>

          <Card className="w-full md:w-64 transform rotate-0 md:-rotate-6 border border-divider animate-bounce-slow" style={{ animationDelay: '0.5s' }}>
            <CardBody className="p-6 text-center">
              <h3 className="font-bold text-default-900">Top Candidate</h3>
              <p className="mt-2 text-default-600">John Doe</p>
              <div className="mt-4 h-2 bg-default-200 rounded-full overflow-hidden">
                <div className="h-2 bg-primary rounded-full w-4/5"></div>
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 md:px-20 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-default-900">
          Everything You Need to Hire Better
        </h2>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          {[
            {
              title: "AI Resume Analysis",
              desc: "Automatically analyze resumes with semantic matching and skill extraction.",
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
              className="border border-divider hover:border-primary transition-colors"
              isPressable
            >
              <CardBody className="p-8">
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}/10 flex items-center justify-center mb-4`}>
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
      <section id="how" className="bg-default-50 py-20 px-6 md:px-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-default-900">
          How It Works
        </h2>

        <div className="grid md:grid-cols-4 gap-6 mt-16 text-center">
          {[
            "Upload Job Description", 
            "Upload Resumes", 
            "AI Analyzes & Scores", 
            "View Ranked Candidates"
          ].map((step, index) => (
            <Card key={index} className="border border-divider">
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
      <section className="px-6 md:px-20 py-20">
        <Card className="bg-primary text-primary-foreground">
          <CardBody className="p-12 text-center">
            <h2 className="text-3xl font-bold">Ready to transform your hiring?</h2>
            <p className="mt-4 opacity-80 max-w-xl mx-auto">
              Join thousands of companies using TecnoLegacy to find the best talent faster.
            </p>
            <Button as={Link} to="/register" color="default" size="lg" radius="full" className="mt-8">
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
