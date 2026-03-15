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
      className="surface-card flex flex-col justify-between rounded-2xl p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-default-500">
            {displayLabel}
          </p>
          <p className="mt-2 text-2xl font-semibold text-default-900">
            {value}
          </p>
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-default-500">
        {change !== null && (
          <>
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isPositive
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
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
