import { Link } from 'react-router-dom';

const Pill = ({ children }) => (
  <span className="px-3 py-1 rounded bg-blue-50 text-blue-600 text-xs font-semibold">{children}</span>
);

const Card = ({ title, desc }) => (
  <div className="bg-white rounded shadow p-6 hover:shadow-md transition">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-gray-600">{desc}</p>
  </div>
);

const Landing = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-blue-600" />
          <span className="text-lg font-bold">Tecnoprism</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-gray-700">
          <a href="#features" className="hover:text-blue-600">Features</a>
          <a href="#about" className="hover:text-blue-600">About</a>
          <a href="#contact" className="hover:text-blue-600">Contact</a>
          <Link to="/login" className="px-4 py-2 rounded bg-black text-white">Get started</Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-12 pb-16 text-center">
        <div className="flex justify-center gap-2 mb-6">
          <Pill>Minimal</Pill>
          <Pill>Modern</Pill>
          <Pill>ATS Platform</Pill>
        </div>
        <h1 className="text-3xl md:text-3xl font-bold mb-3">Streamline Hiring With Tecnoprism</h1>
        <p className="text-gray-600 mb-8">Plan, publish, and evaluate candidates with an AI‑assisted Applicant Tracking System.</p>
        <div className="flex justify-center gap-4">
          <Link to="/register" className="px-5 py-2 rounded bg-blue-600 text-white">Create account</Link>
          <Link to="/login" className="px-5 py-2 rounded border">Sign in</Link>
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 pb-16">
        <Card title="Job Management" desc="Create roles, track status, and collaborate with HR in real time." />
        <Card title="AI Scoring" desc="Automatically score resumes and highlight best matches instantly." />
        <Card title="Candidate Portal" desc="Simple applications, status updates, and transparent feedback." />
      </section>

      <section id="about" className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Built For Teams</h3>
            <p className="text-sm text-gray-600">Keep HR, admins, and candidates aligned with clear workflows.</p>
          </div>
          <div className="bg-white rounded shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Fast & Secure</h3>
            <p className="text-sm text-gray-600">Powered by FastAPI, MongoDB, and a modern React frontend.</p>
          </div>
          <div className="bg-white rounded shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Consistent Design</h3>
            <p className="text-sm text-gray-600">Soft cards, clean typography, and ample whitespace keep it minimal.</p>
          </div>
        </div>
      </section>

      <section id="contact" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-blue-50 rounded p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">Ready to hire smarter?</h3>
            <p className="text-sm text-gray-600">Start free and upgrade when your team is ready.</p>
          </div>
          <Link to="/register" className="px-5 py-2 rounded bg-blue-600 text-white">Get started</Link>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>© {new Date().getFullYear()} Tecnoprism</span>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-blue-600">Login</Link>
            <Link to="/register" className="hover:text-blue-600">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
