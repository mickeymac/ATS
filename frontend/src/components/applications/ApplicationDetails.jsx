import React from 'react';
import { 
  Chip, 
  Divider, 
  Button, 
  Progress,
  Avatar,
  Card,
  CardBody,
  Tooltip
} from '@nextui-org/react';
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Check,
  Calendar,
  Clock,
  Star,
  Target,
  FileText,
  Linkedin,
  Github,
  GraduationCap,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const statusColorMap = {
  'Applied': 'default',
  'Under Review': 'warning',
  'Shortlisted': 'success',
  'Interview Scheduled': 'primary',
  'Selected': 'success',
  'Rejected': 'danger',
};

export function ApplicationDetails({ application, onStatusUpdate, isHR }) {
  if (!application) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-default-50/30">
        <div className="p-6 rounded-full bg-default-100 mb-6 group-hover:scale-110 transition-transform duration-500">
          <Target size={48} className="text-default-300" />
        </div>
        <h3 className="text-xl font-black text-default-900 mb-2">No Application Selected</h3>
        <p className="text-default-500 max-w-xs mx-auto leading-relaxed">
          Select an application from the list to view the full ATS analysis and candidate profile.
        </p>
      </div>
    );
  }

  const candidateSkills = application.candidate_skills || application.matched_skills || [];
  const matchedSkills = application.matched_skills || [];
  const missingSkills = application.missing_skills || [];

  return (
    <div className="flex h-full flex-col gap-8 overflow-y-auto p-6 custom-scrollbar bg-white">
      {/* Premium Profile Header */}
      <div className="relative">
        <div className="flex items-center gap-5">
          <Avatar
            src={`https://i.pravatar.cc/150?u=${application._id}`}
            name={application.candidate_name_extracted?.charAt(0) || '?'}
            size="lg"
            isBordered
            color="primary"
            className="w-20 h-20 text-xl font-black shadow-xl"
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-default-900 tracking-tight leading-none">
                {application.candidate_name_extracted || 'Unknown Candidate'}
              </h2>
              <Chip 
                color={statusColorMap[application.status] || 'default'}
                variant="flat"
                className="font-bold text-[10px] uppercase h-5 px-2"
              >
                {application.status}
              </Chip>
            </div>
            <p className="text-default-500 font-bold text-sm flex items-center gap-2">
              <Briefcase size={14} className="text-primary" />
              {application.job_title}
            </p>
            <div className="flex items-center gap-4 mt-1">
              {application.candidate_email && (
                <Tooltip content={application.candidate_email}>
                  <div className="p-2 rounded-lg bg-default-100 text-default-600 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                    <Mail size={16} />
                  </div>
                </Tooltip>
              )}
              {application.candidate_phone && (
                <Tooltip content={application.candidate_phone}>
                  <div className="p-2 rounded-lg bg-default-100 text-default-600 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                    <Phone size={16} />
                  </div>
                </Tooltip>
              )}
              <div className="p-2 rounded-lg bg-default-100 text-default-600 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                <Linkedin size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Divider className="opacity-50" />

      {/* ATS Analysis Card */}
      <Card className="border border-divider shadow-sm bg-default-50/50 overflow-hidden">
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Target size={20} />
              </div>
              <h3 className="font-black text-default-900 uppercase tracking-widest text-xs">ATS Match Analysis</h3>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-3xl font-black leading-none ${
                application.final_score >= 80 ? 'text-success' : 
                application.final_score >= 60 ? 'text-warning' : 'text-danger'
              }`}>
                {application.final_score?.toFixed(0) || 0}%
              </span>
              <span className="text-[10px] font-bold text-default-400 uppercase tracking-tighter mt-1">Overall Compatibility</span>
            </div>
          </div>
          
          <Progress 
            value={application.final_score || 0} 
            color={application.final_score >= 80 ? 'success' : application.final_score >= 60 ? 'warning' : 'danger'} 
            className="h-3 mb-8 shadow-inner"
            size="lg"
          />

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-divider/50 shadow-sm group hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:scale-110 transition-transform">
                  <Star size={16} />
                </div>
                <span className="text-sm font-bold text-default-700">Skills Alignment</span>
              </div>
              <span className={`text-sm font-black ${application.skill_score >= 80 ? 'text-success' : 'text-primary'}`}>
                {application.skill_score?.toFixed(0) || 0}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-divider/50 shadow-sm group hover:border-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/5 text-secondary group-hover:scale-110 transition-transform">
                  <Briefcase size={16} />
                </div>
                <span className="text-sm font-bold text-default-700">Experience Match</span>
              </div>
              <span className={`text-sm font-black ${application.experience_score >= 80 ? 'text-success' : 'text-secondary'}`}>
                {application.experience_score?.toFixed(0) || 0}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-divider/50 shadow-sm group hover:border-warning/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/5 text-warning group-hover:scale-110 transition-transform">
                  <GraduationCap size={16} />
                </div>
                <span className="text-sm font-bold text-default-700">Education Fit</span>
              </div>
              <span className={`text-sm font-black ${application.education_score >= 80 ? 'text-success' : 'text-warning'}`}>
                {application.education_score?.toFixed(0) || 0}%
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Skills Analysis */}
      {(matchedSkills.length > 0 || missingSkills.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
              <TrendingUp size={18} />
            </div>
            <h3 className="font-black text-default-900 uppercase tracking-widest text-xs">Skill Intelligence</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {matchedSkills.length > 0 && (
              <div className="p-4 rounded-2xl bg-success-50/30 border border-success-100">
                <p className="text-[10px] font-black text-success-600 uppercase mb-3 tracking-widest">Strengths Found</p>
                <div className="flex flex-wrap gap-2">
                  {matchedSkills.map((skill) => (
                    <Chip key={skill} size="sm" variant="dot" color="success" className="bg-white border-success-200 font-bold h-7 px-3">
                      {skill}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            
            {missingSkills.length > 0 && (
              <div className="p-4 rounded-2xl bg-danger-50/30 border border-danger-100">
                <p className="text-[10px] font-black text-danger-600 uppercase mb-3 tracking-widest">Potential Gaps</p>
                <div className="flex flex-wrap gap-2">
                  {missingSkills.map((skill) => (
                    <Chip key={skill} size="sm" variant="dot" color="danger" className="bg-white border-danger-200 font-bold h-7 px-3">
                      {skill}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Professional Summary */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-default-100 text-default-600">
            <FileText size={18} />
          </div>
          <h3 className="font-black text-default-900 uppercase tracking-widest text-xs">Candidate Narrative</h3>
        </div>
        <div className="relative p-6 rounded-2xl bg-default-50/50 border border-divider border-dashed italic text-sm text-default-600 leading-relaxed group hover:bg-default-50 transition-colors">
          <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-white border border-divider text-[10px] font-bold text-default-400 uppercase tracking-widest">
            AI Generated Summary
          </div>
          {application.candidate_summary ? application.candidate_summary.substring(0, 500) : (application.parsed_text?.substring(0, 500) || "No summary available")}...
        </div>
      </div>

       {/* Floating Sticky Actions */}
       {isHR && (
         <div className="sticky bottom-2 left-0 right-0 z-20 mt-auto">
           <Card className="bg-white/80 backdrop-blur-md border border-divider shadow-2xl overflow-hidden">
             <CardBody className="p-3 flex items-center gap-3">
               <Button 
                 color="success" 
                 variant="shadow"
                 className="flex-1 font-black uppercase text-xs h-12 shadow-success-200" 
                 startContent={<CheckCircle size={18} />}
                 onPress={() => onStatusUpdate(application._id, 'Shortlisted')}
                 isDisabled={application.status === 'Shortlisted'}
               >
                 Shortlist
               </Button>
               <Button 
                 color="primary" 
                 variant="flat"
                 className="flex-1 font-black uppercase text-xs h-12 bg-primary/10" 
                 startContent={<Calendar size={18} />}
                 onPress={() => onStatusUpdate(application._id, 'Interview Scheduled')}
                 isDisabled={application.status === 'Interview Scheduled'}
               >
                 Schedule
               </Button>
               <Tooltip content="Reject Candidate">
                 <Button 
                   color="danger" 
                   variant="flat" 
                   isIconOnly
                   className="h-12 w-12 bg-danger/10 min-w-0"
                   onPress={() => onStatusUpdate(application._id, 'Rejected')}
                   isDisabled={application.status === 'Rejected'}
                 >
                   <XCircle size={20} />
                 </Button>
               </Tooltip>
             </CardBody>
           </Card>
         </div>
       )}
    </div>
  );
}
