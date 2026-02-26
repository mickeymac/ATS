import { 
  Chip, 
  Divider, 
  Button, 
  Progress
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
  Clock
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
    return <div className="p-4 text-center text-default-500">Select an application to view details</div>;
  }

  const candidateSkills = application.candidate_skills || application.matched_skills || [];
  const matchedSkills = application.matched_skills || [];
  const missingSkills = application.missing_skills || [];

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      {/* Header Info */}
      <div className="flex flex-col gap-4">
        <div>
           <h2 className="text-2xl font-bold text-default-900">{application.candidate_name_extracted || 'Unknown Candidate'}</h2>
           <p className="text-default-700 font-medium">{application.job_title} • {application.candidate_experience_years || 0} years experience</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-default-600">
           {application.candidate_email && (
             <div className="flex items-center gap-1"><Mail size={14} className="text-default-900" /> {application.candidate_email}</div>
           )}
           {application.candidate_phone && (
             <div className="flex items-center gap-1"><Phone size={14} className="text-default-900" /> {application.candidate_phone}</div>
           )}
        </div>
        <div>
          <Chip 
            color={statusColorMap[application.status] || 'default'}
            variant="flat"
          >
            {application.status}
          </Chip>
        </div>
      </div>

      <Divider />

      {/* ATS Analysis */}
      <div className="rounded-xl bg-content2 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-default-900">ATS Match Score</h3>
          <span className={`text-2xl font-bold ${application.final_score >= 80 ? 'text-success' : application.final_score >= 60 ? 'text-warning' : 'text-danger'}`}>
            {application.final_score?.toFixed(0) || 0}%
          </span>
        </div>
        <Progress 
          value={application.final_score || 0} 
          color={application.final_score >= 80 ? 'success' : application.final_score >= 60 ? 'warning' : 'danger'} 
          className="mb-4"
          size="md"
        />
        <div className="flex flex-col gap-2">
           <div className="flex items-center justify-between text-sm">
             <span className="text-default-900">Skills Score</span>
             <span className={`font-medium ${application.skill_score >= 80 ? 'text-success' : application.skill_score >= 60 ? 'text-warning' : 'text-danger'}`}>
               {application.skill_score?.toFixed(0) || 0}%
             </span>
           </div>
           <div className="flex items-center justify-between text-sm">
             <span className="text-default-900">Experience Score</span>
             <span className={`font-medium ${application.experience_score >= 80 ? 'text-success' : application.experience_score >= 60 ? 'text-warning' : 'text-danger'}`}>
               {application.experience_score?.toFixed(0) || 0}%
             </span>
           </div>
           <div className="flex items-center justify-between text-sm">
             <span className="text-default-900">Education Score</span>
             <span className={`font-medium ${application.education_score >= 80 ? 'text-success' : application.education_score >= 60 ? 'text-warning' : 'text-danger'}`}>
               {application.education_score?.toFixed(0) || 0}%
             </span>
           </div>
           <div className="flex items-center justify-between text-sm">
             <span className="text-default-900">Semantic Match</span>
             <span className={`font-medium ${application.semantic_score >= 80 ? 'text-success' : application.semantic_score >= 60 ? 'text-warning' : 'text-danger'}`}>
               {application.semantic_score?.toFixed(0) || 0}%
             </span>
           </div>
        </div>
      </div>

      <Divider />

      {/* Skill Match Analysis */}
      {(matchedSkills.length > 0 || missingSkills.length > 0) && (
        <div>
          <h3 className="mb-3 font-semibold text-default-900">Skill Match Analysis</h3>
          <div className="flex flex-col gap-3">
            {matchedSkills.slice(0, 5).map((skill) => (
              <div key={skill} className="flex items-center justify-between rounded-lg border border-divider p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20 text-success">
                    <Check size={14} />
                  </div>
                  <span className="text-sm font-medium text-default-900">{skill}</span>
                </div>
                <Chip size="sm" variant="flat" color="success">Match</Chip>
              </div>
            ))}
            {missingSkills.slice(0, 3).map((skill) => (
              <div key={skill} className="flex items-center justify-between rounded-lg border border-divider p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-danger/20 text-danger">
                    <XCircle size={14} />
                  </div>
                  <span className="text-sm font-medium text-default-900">{skill}</span>
                </div>
                <Chip size="sm" variant="flat" color="danger">Missing</Chip>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Extracted Skills */}
      {candidateSkills.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-default-900">All Extracted Skills</h3>
          <div className="flex flex-wrap gap-2">
            {candidateSkills.map((skill, idx) => (
              <Chip key={idx} size="sm" variant="flat" color="primary">{skill}</Chip>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      <div>
        <h3 className="mb-3 font-semibold text-default-900">Experience</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
             <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-default-100 text-default-900">
               <Briefcase size={16} />
             </div>
             <div>
                <h4 className="font-medium text-default-900">{application.job_title}</h4>
                <p className="text-sm text-default-600">{application.candidate_experience_years || 0} years {application.candidate_experience_months || 0} months</p>
                {application.candidate_summary && (
                  <p className="mt-1 text-sm text-default-700">{application.candidate_summary.substring(0, 200)}...</p>
                )}
             </div>
          </div>
        </div>
      </div>

       {/* Actions */}
       {isHR && (
         <div className="sticky bottom-0 bg-default-50 pt-4 pb-2 z-10">
           <div className="flex gap-2">
             <Button 
               color="success" 
               className="flex-1" 
               startContent={<CheckCircle size={18} />}
               onPress={() => onStatusUpdate(application._id, 'Shortlisted')}
               isDisabled={application.status === 'Shortlisted'}
             >
               Shortlist
             </Button>
             <Button 
               color="warning" 
               className="flex-1" 
               startContent={<Calendar size={18} />}
               onPress={() => onStatusUpdate(application._id, 'Interview Scheduled')}
               isDisabled={application.status === 'Interview Scheduled'}
             >
               Interview
             </Button>
             <Button 
               color="danger" 
               variant="flat" 
               isIconOnly
               onPress={() => onStatusUpdate(application._id, 'Rejected')}
               isDisabled={application.status === 'Rejected'}
             >
               <XCircle size={18} />
             </Button>
           </div>
         </div>
       )}
    </div>
  );
}
