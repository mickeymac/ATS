// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const PageHeader = ({ title, description, actions }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0">
          {actions}
        </div>
      )}
    </motion.div>
  );
};

export { PageHeader };
export default PageHeader;
