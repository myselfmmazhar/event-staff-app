"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function InvitationResultContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const event = searchParams.get("event");
  const position = searchParams.get("position");
  const already = searchParams.get("already") === "true";
  const confirmed = searchParams.get("confirmed") === "true";

  const isAccepted = status === "ACCEPTED";
  const isDeclined = status === "DECLINED";
  const isWaitlisted = status === "WAITLISTED";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {already ? (
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Info className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Already Responded</h1>
            <p className="text-slate-600">
              You have already responded to this invitation.
            </p>
          </div>
        ) : isAccepted ? (
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Invitation Accepted</h1>
            <p className="text-slate-600">
              {confirmed 
                ? "Great! You have been confirmed for this position." 
                : "Thank you for accepting. You've been added to the waitlist and will be notified if a spot opens up."}
            </p>
          </div>
        ) : isDeclined ? (
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Invitation Declined</h1>
            <p className="text-slate-600">
              You have declined the invitation for this position.
            </p>
          </div>
        ) : isWaitlisted ? (
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Added to Waitlist</h1>
            <p className="text-slate-600">
              All positions are currently filled, but you've been added to the waitlist.
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <Info className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Request</h1>
            <p className="text-slate-600">
              We couldn't process your request. Please try again or contact support.
            </p>
          </div>
        )}

        <div className="bg-slate-50 rounded-xl p-4 mb-8 text-left">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Position</div>
          <div className="text-slate-900 font-medium mb-3">{position || "Staff"}</div>
          
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Event</div>
          <div className="text-slate-900 font-medium">{event || "Event Details"}</div>
        </div>

        <Link href="/login">
          <Button className="w-full h-12 text-base font-semibold">
            Log In to View My Schedule
          </Button>
        </Link>
        
        <p className="mt-6 text-sm text-slate-400">
          Tripod &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default function InvitationResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <InvitationResultContent />
    </Suspense>
  );
}
