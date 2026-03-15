// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const PageHeader = ({ title, description, actions }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="surface-card flex flex-col gap-2 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-default-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-default-500">
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
