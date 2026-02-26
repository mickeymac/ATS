import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const StatCard = ({ label, title, value, icon: Icon, change = null }) => {
  const displayLabel = label ?? title;
  const isPositive = (change ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm ring-1 ring-black/0 dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {displayLabel}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {value}
          </p>
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        {change !== null && (
          <>
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isPositive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
              }`}
            >
              {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              <span>{Math.abs(change)}%</span>
            </span>
            <span className="ml-1">vs last period</span>
          </>
        )}
      </div>
    </motion.div>
  );
};

export { StatCard };
export default StatCard;
