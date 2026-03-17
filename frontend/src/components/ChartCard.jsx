// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const ChartCard = ({ title, description, children, height = 'h-64' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="surface-card rounded-2xl p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-default-900">
            {title}
          </p>
          {description && (
            <p className="text-xs text-default-500">
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
