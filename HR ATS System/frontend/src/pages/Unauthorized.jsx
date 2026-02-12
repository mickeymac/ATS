import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Unauthorized</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          You don’t have permission to access this page.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/dashboard"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
          >
            Go to dashboard
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
