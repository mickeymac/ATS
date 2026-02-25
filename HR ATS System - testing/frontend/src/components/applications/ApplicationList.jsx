import { User, Chip, Progress } from '@nextui-org/react';
import { ChevronRight } from 'lucide-react';

const statusColorMap = {
  'Applied': 'default',
  'Under Review': 'warning',
  'Shortlisted': 'success',
  'Interview Scheduled': 'primary',
  'Selected': 'success',
  'Rejected': 'danger',
};

export function ApplicationList({ applications, selectedId, onSelect }) {
  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-y-auto pr-2">
      {applications.map((app) => (
        <div
          key={app._id}
          onClick={() => onSelect(app._id)}
          className={`cursor-pointer rounded-xl border p-4 transition-all hover:bg-default-100 ${
            selectedId === app._id 
              ? "border-primary bg-primary/5 shadow-sm" 
              : "border-divider bg-content1"
          }`}
        >
          <div className="flex items-center justify-between">
            <User   
              name={app.candidate_name_extracted || 'Unknown'}
              description={app.job_title}
              avatarProps={{
                src: `https://i.pravatar.cc/150?u=${app._id}`,
                size: "sm"
              }}
              classNames={{
                name: "text-default-900 font-medium",
                description: "text-default-600",
              }}
            />
            <ChevronRight size={16} className="text-default-600" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-default-700">ATS Score</span>
              <span className={`text-sm font-bold ${
                app.final_score >= 80 ? "text-success" : app.final_score >= 60 ? "text-warning" : "text-danger"
              }`}>
                {app.final_score?.toFixed(0) || 0}%
              </span>
            </div>
            <Chip size="sm" variant="flat" color={statusColorMap[app.status] || 'default'}>
              {app.status}
            </Chip>
          </div>
          <div className="mt-2">
            <Progress 
              size="sm" 
              value={app.final_score || 0} 
              color={app.final_score >= 80 ? "success" : app.final_score >= 60 ? "warning" : "danger"}
              className="max-w-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
