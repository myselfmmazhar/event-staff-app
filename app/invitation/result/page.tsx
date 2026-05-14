import { XCircle, Clock, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/server/prisma";
import { TemplateService } from "@/services/template.service";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

async function renderAcceptedTemplate(params: SearchParams): Promise<string> {
  const confirmed = pick(params, "confirmed") === "true";
  const templateService = new TemplateService(prisma);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const { html } = await templateService.renderEmail("CALL_TIME_INVITATION_ACCEPTED", {
    firstName: pick(params, "firstName") || "",
    positionName: pick(params, "position") || "Staff",
    eventTitle: pick(params, "event") || "",
    eventVenue: pick(params, "venue") || "",
    eventLocation: pick(params, "location") || "",
    startDate: pick(params, "startDate") || "",
    endDate: pick(params, "endDate") || "",
    startTime: pick(params, "startTime") || "",
    endTime: pick(params, "endTime") || "",
    loginUrl: `${appUrl}/login`,
    dashboardUrl: `${appUrl}/my-schedule`,
    confirmationStatus: confirmed ? "Confirmed" : "Waitlisted",
    statusMessage: confirmed
      ? "Great! You have been confirmed for this position."
      : "Thank you for accepting. You've been added to the waitlist and will be notified if a spot opens up.",
    isWaitlisted: confirmed ? "" : "true",
  });

  return html;
}

export default async function InvitationResultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = pick(params, "status");
  const event = pick(params, "event");
  const position = pick(params, "position");
  const already = pick(params, "already") === "true";

  const isAccepted = status === "ACCEPTED";
  const isDeclined = status === "DECLINED";
  const isWaitlisted = status === "WAITLISTED";

  if (isAccepted && !already) {
    const html = await renderAcceptedTemplate(params);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <iframe
          title="Invitation Accepted"
          srcDoc={html}
          className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border-0"
          style={{ height: "min(90vh, 800px)" }}
        />
      </div>
    );
  }

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
