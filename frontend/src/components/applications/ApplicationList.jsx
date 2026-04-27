import React from 'react';
import { User, Chip, Progress, Card, CardBody, Avatar } from '@nextui-org/react';
import { ChevronRight, Star, Briefcase, Mail, Clock } from 'lucide-react';
import { getInitials } from '../../utils/helpers';

const statusColorMap = {
  'Applied': 'default',
  'Under Review': 'warning',
  'Shortlisted': 'success',
  'Interview Scheduled': 'primary',
  'Selected': 'success',
  'Rejected': 'danger',
};

export function ApplicationList({ applications, selectedId, onSelect }) {
  if (!applications || applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="p-4 rounded-full bg-default-100 mb-4">
          <Briefcase size={32} className="text-default-400" />
        </div>
        <p className="text-default-500 font-medium">No applications found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-1">
      {applications.map((app) => (
        <Card
          key={app._id}
          isPressable
          onPress={() => onSelect(app._id)}
          className={`group border-2 transition-all duration-300 shadow-sm overflow-hidden ${
            selectedId === app._id 
              ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
              : "border-transparent bg-default-50/50 hover:bg-default-100 hover:border-divider"
          }`}
        >
          <CardBody className="p-4 flex flex-col gap-3">
            {/* Top Row: Avatar & Status */}
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-3">
                <Avatar
                  name={getInitials(app.candidate_name_extracted)}
                  showFallback={true}
                  size="md"
                  isBordered
                  color={selectedId === app._id ? "primary" : "default"}
                  className="w-10 h-10 text-xs font-black shrink-0"
                />
                <div className="flex flex-col overflow-hidden">
                  <h4 className={`font-black text-sm truncate transition-colors ${
                    selectedId === app._id ? "text-primary" : "text-default-900"
                  }`}>
                    {app.candidate_name_extracted || 'Unknown'}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-default-500 font-bold uppercase tracking-wider">
                    <Briefcase size={10} />
                    <span className="truncate">{app.job_title}</span>
                  </div>
                </div>
              </div>
              <Chip 
                size="sm" 
                variant="flat" 
                color={statusColorMap[app.status] || 'default'}
                className="font-bold text-[10px] uppercase h-5 shrink-0"
              >
                {app.status}
              </Chip>
            </div>

            {/* Middle Row: Score & Progress */}
            <div className="bg-default-100/50 rounded-xl p-3 border border-divider/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Star size={12} className={
                    app.final_score >= 80 ? "text-success fill-success" : 
                    app.final_score >= 60 ? "text-warning fill-warning" : "text-danger fill-danger"
                  } />
                  <span className="text-[10px] font-black text-default-400 uppercase tracking-widest">Match Score</span>
                </div>
                <span className={`text-sm font-black ${
                  app.final_score >= 80 ? "text-success" : 
                  app.final_score >= 60 ? "text-warning" : "text-danger"
                }`}>
                  {app.final_score?.toFixed(0) || 0}%
                </span>
              </div>
              <Progress 
                size="sm" 
                value={app.final_score || 0} 
                color={app.final_score >= 80 ? "success" : app.final_score >= 60 ? "warning" : "danger"}
                className="h-1.5"
              />
            </div>

            {/* Bottom Row: Metadata */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[10px] text-default-400 font-bold">
                  <Clock size={10} />
                  <span>{new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
                {app.candidate_email && (
                  <div className="flex items-center gap-1 text-[10px] text-default-400 font-bold">
                    <Mail size={10} />
                    <span className="max-w-[80px] truncate">{app.candidate_email}</span>
                  </div>
                )}
              </div>
              <div className={`p-1 rounded-lg transition-transform group-hover:translate-x-1 ${
                selectedId === app._id ? "bg-primary text-white" : "bg-default-200 text-default-400"
              }`}>
                <ChevronRight size={14} />
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
