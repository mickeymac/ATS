// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const ChartCard = ({ title, description, children, height = 'h-64' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm ring-1 ring-black/0 dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
            {title}
          </p>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className={`${height} min-h-[200px]`}>
        {children}
      </div>
    </motion.div>
  );
};

export { ChartCard };
export default ChartCard;
