import { Tooltip } from '@nextui-org/react';
import { Check } from 'lucide-react';

/**
 * ReviewStepper - Visual stepper for application review workflow
 * 
 * Steps:
 * 1. Applied - Initial state when resume is uploaded
 * 2. Sent for Review - Recruiter sent to Team Lead
 * 3. Reviewed - Team Lead completed review (Approved/Not Selected)
 */
export default function ReviewStepper({ reviewStatus = 'pending', reviewedAt, sentForReviewAt }) {
  // Map review_status to step number
  const getStepNumber = () => {
    switch (reviewStatus) {
      case 'pending': return 1;
      case 'sent_for_review': return 2;
      case 'approved': return 3;
      case 'not_selected': return 3;
      default: return 1;
    }
  };

  const currentStep = getStepNumber();

  const steps = [
    {
      id: 1,
      label: 'Applied',
      tooltip: 'Candidate has applied',
    },
    {
      id: 2,
      label: 'Sent for Review',
      tooltip: sentForReviewAt 
        ? `Sent for review on ${new Date(sentForReviewAt).toLocaleDateString()}`
        : 'Waiting to be sent for Team Lead review',
    },
    {
      id: 3,
      label: reviewStatus === 'approved' ? 'Approved' : reviewStatus === 'not_selected' ? 'Not Selected' : 'Reviewed',
      tooltip: reviewedAt
        ? `${reviewStatus === 'approved' ? 'Approved' : 'Not selected'} on ${new Date(reviewedAt).toLocaleDateString()}`
        : 'Awaiting Team Lead review',
    },
  ];

  const getStepStyle = (step) => {
    const isCompleted = currentStep > step.id;
    const isCurrent = currentStep === step.id;
    const isNotSelected = step.id === 3 && reviewStatus === 'not_selected';
    const isApproved = step.id === 3 && reviewStatus === 'approved';

    if (isNotSelected) {
      return {
        circle: 'bg-danger border-danger text-white',
        line: '',
      };
    }
    if (isApproved) {
      return {
        circle: 'bg-success border-success text-white',
        line: '',
      };
    }
    if (isCompleted) {
      return {
        circle: 'bg-success border-success text-white',
        line: 'bg-success',
      };
    }
    if (isCurrent) {
      return {
        circle: 'bg-primary border-primary text-white ring-4 ring-primary/20',
        line: '',
      };
    }
    return {
      circle: 'bg-default-100 border-default-300 text-default-500',
      line: 'bg-default-200',
    };
  };

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, index) => {
        const style = getStepStyle(step);
        const isLast = index === steps.length - 1;
        const isCompleted = currentStep > step.id;

        return (
          <div key={step.id} className="flex items-center">
            <Tooltip content={step.tooltip} placement="top">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all cursor-pointer ${style.circle}`}
              >
                {isCompleted ? (
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <span className="text-[10px] font-semibold">{step.id}</span>
                )}
              </div>
            </Tooltip>
            {!isLast && (
              <div className={`h-0.5 w-8 ${currentStep > step.id ? 'bg-success' : 'bg-default-200'} transition-all`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
