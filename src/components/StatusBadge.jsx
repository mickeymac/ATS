const statusStyles = {
  Selected: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Under Review': 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Applied: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  'Interview Scheduled': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  Shortlisted: 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

export const StatusBadge = ({ status }) => {
  const classes = statusStyles[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>
      {status}
    </span>
  );
};

export const ScoreBar = ({ value }) => {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="w-full rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className="h-2 rounded-full bg-brand transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};

