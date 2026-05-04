'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  CalendarDaysIcon,
  UsersIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  XIcon
} from 'lucide-react';
import { trpc } from '@/lib/client/trpc';

interface OnboardingTourProps {
  isClient: boolean;
  isOpen: boolean;
}

export function OnboardingTour({ isClient, isOpen }: OnboardingTourProps) {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const utils = trpc.useUtils();
  const markSeenMutation = trpc.profile.markOnboardingAsSeen.useMutation({
    onSuccess: () => {
      utils.profile.getMyProfile.refetch();
    }
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleComplete = () => {
    markSeenMutation.mutate();
  };

  const nextStep = () => {
    if (currentStep < getSteps().length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const getSteps = () => {
    if (isClient) {
      const subtitle = "Plan, assign, and manage your tasks with full visibility — from staffing to final billing.";
      return [
        {
          title: "Submit Requests",
          subtitle,
          heading: "Welcome to Your Dashboard",
          description: "Easily submit task and assignment requests for your staffing needs.",
          icon: <BriefcaseIcon className="w-10 h-10 text-blue-600" />,
          color: "bg-blue-500/10"
        },
        {
          title: "Track Coverage",
          subtitle,
          heading: "Welcome to Your Dashboard",
          description: "Monitor assignment progress and staffing status in real time.",
          icon: <UsersIcon className="w-10 h-10 text-green-600" />,
          color: "bg-green-500/10"
        },
        {
          title: "Manage Events & Finances",
          subtitle,
          heading: "Welcome to Your Dashboard",
          description: "View task details, schedules, estimates, and invoices in one place.",
          icon: <CalendarDaysIcon className="w-10 h-10 text-purple-600" />,
          color: "bg-purple-500/10"
        }
      ];
    } else {
      const subtitle = "View assignments, manage your schedule, and track your work — all in one place.";
      return [
        {
          title: "Find & Accept Assignments",
          subtitle,
          heading: "Welcome to the Talent Portal",
          description: "Review available assignments and quickly accept opportunities that match your schedule.",
          icon: <BriefcaseIcon className="w-10 h-10 text-blue-600" />,
          color: "bg-blue-500/10"
        },
        {
          title: "Manage Your Schedule",
          subtitle,
          heading: "Welcome to the Talent Portal",
          description: "View upcoming assignments, track shift times, and stay organized.",
          icon: <CalendarDaysIcon className="w-10 h-10 text-green-600" />,
          color: "bg-green-500/10"
        },
        {
          title: "Track Work & Payments",
          subtitle,
          heading: "Welcome to the Talent Portal",
          description: "Monitor completed assignments and stay updated on payment status.",
          icon: <CheckCircleIcon className="w-10 h-10 text-purple-600" />,
          color: "bg-purple-500/10"
        }
      ];
    }
  };

  const steps = getSteps();

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <AnimatePresence mode="wait">
        <motion.div
           key={currentStep}
           initial={{ opacity: 0, y: 20, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: -20, scale: 0.95 }}
           transition={{ duration: 0.3, ease: "easeOut" }}
           className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card border shadow-2xl"
        >
          {/* Background Gradient */}
          <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          <button 
            onClick={handleComplete}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors z-10"
            aria-label="Skip tour"
          >
            <XIcon className="w-5 h-5" />
          </button>

          <div className="p-8 pb-6">
             <div className="mb-6 flex justify-center">
               <div className={`p-4 rounded-full ${steps?.[currentStep]?.color || ''}`}>
                 {steps?.[currentStep]?.icon}
               </div>
             </div>
             
             <div className="text-center space-y-3 relative z-10">
               <p className="text-sm font-semibold text-primary uppercase tracking-widest">{steps?.[currentStep]?.heading || ''}</p>
               <h2 className="text-2xl font-bold tracking-tight text-foreground">{steps?.[currentStep]?.title || ''}</h2>
               <p className="text-xs text-muted-foreground/70 leading-relaxed">{steps?.[currentStep]?.subtitle || ''}</p>
               <p className="text-muted-foreground leading-relaxed">
                 {steps?.[currentStep]?.description || ''}
               </p>
             </div>
          </div>

          <div className="p-8 pt-0 flex flex-col items-center gap-6 relative z-10">
            {/* Dots */}
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-300 ${i === currentStep ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`} 
                />
              ))}
            </div>

            <div className="flex w-full gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="flex-1 text-base font-semibold py-6 rounded-xl group"
                >
                  <ChevronLeftIcon className="w-5 h-5 mr-1 -ml-1 transition-transform group-hover:-translate-x-1" />
                  Back
                </Button>
              )}
              <Button
                onClick={nextStep}
                className="flex-1 text-base font-semibold py-6 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all group"
              >
                {currentStep === steps.length - 1 ? "Get Started" : "Continue"}
                <ChevronRightIcon className="w-5 h-5 ml-1 -mr-1 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
            
            {currentStep < steps.length - 1 && (
              <button 
                onClick={handleComplete}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip overview
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
