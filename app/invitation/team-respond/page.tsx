import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, XCircle, Users, MapPin, Calendar } from 'lucide-react';
import { prisma } from '@/lib/server/prisma';
import { CallTimeService } from '@/services/call-time.service';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return '';
  const hour = parseInt(parts[0] || '0', 10);
  const minutes = parts[1] || '00';
  if (isNaN(hour)) return '';
  const ampm = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes}${ampm}`;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return 'TBD';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function TeamInvitationRespondPage({ searchParams }: PageProps) {
  const { token, error } = await searchParams;

  if (!token) notFound();

  const service = new CallTimeService(prisma);
  let data: Awaited<ReturnType<typeof service.getTeamInvitationByToken>>;
  try {
    data = await service.getTeamInvitationByToken(token);
  } catch {
    notFound();
  }

  // Already responded?
  if (data.invitation.status !== 'PENDING') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Already Responded</h1>
          <p className="text-slate-600">
            This invitation has already been {data.invitation.status.toLowerCase()}.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center w-full h-12 px-4 rounded-md bg-slate-900 text-white text-base font-semibold"
          >
            Log In to View My Schedule
          </Link>
        </div>
      </div>
    );
  }

  const ct = data.callTime;
  const availableUnits = data.units.filter((u) => u.available);
  const errorMessage = error
    ? error === 'unit-required'
      ? 'Please select a team unit before accepting.'
      : decodeURIComponent(error)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6" />
            <span className="text-xs uppercase tracking-wider opacity-90">Team Invitation</span>
          </div>
          <h1 className="text-2xl font-bold">
            Hello {data.manager.firstName}, you've been invited
          </h1>
          <p className="text-sm opacity-90 mt-1">
            Pick which Team Unit will take this assignment, then accept.
          </p>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Assignment summary */}
          <div className="bg-slate-50 rounded-xl p-5 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Position</div>
            <div className="text-slate-900 font-medium text-lg">
              {ct.service?.title || 'Staff'}
            </div>
            <div className="border-t border-slate-200 pt-3 mt-2 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-medium">{ct.event.title}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" />
                {ct.event.venueName ? `${ct.event.venueName} · ` : ''}
                {[ct.event.city, ct.event.state].filter(Boolean).join(', ')}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                {formatDate(ct.startDate)}
                {ct.startTime ? ` · ${formatTime(ct.startTime)}` : ''}
                {ct.endDate ? ` → ${formatDate(ct.endDate)}` : ''}
                {ct.endTime ? ` ${formatTime(ct.endTime)}` : ''}
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
              {errorMessage}
            </div>
          )}

          {/* Unit selection form */}
          <form
            action="/api/public/invitation/team/respond"
            method="POST"
            className="space-y-5"
          >
            <input type="hidden" name="token" value={token} />

            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                Select a Team Unit to assign
              </h2>
              {availableUnits.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
                  None of your team units are currently available for this service. You may still
                  decline below.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.units.map((u) => (
                    <label
                      key={u.id}
                      className={`
                        flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors
                        ${u.available
                          ? 'border-slate-200 hover:border-purple-400 hover:bg-purple-50/30'
                          : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="teamUnitId"
                        value={u.id}
                        disabled={!u.available}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{u.unitName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {u.unitId}
                          {u.primaryContact ? ` · Primary: ${u.primaryContact}` : ''}
                          {!u.available ? ' · Currently assigned to another active task' : ''}
                        </div>
                        {u.capacityNotes && (
                          <div className="text-xs text-slate-500 mt-1 italic">
                            {u.capacityNotes}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                name="action"
                value="accept"
                disabled={availableUnits.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-base font-semibold transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                Accept &amp; Assign Unit
              </button>
              <button
                type="submit"
                name="action"
                value="reject"
                className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-base font-semibold transition-colors"
              >
                <XCircle className="w-5 h-5" />
                Decline
              </button>
            </div>
          </form>
        </div>

        <p className="text-center pb-6 text-sm text-slate-400">
          Tripod &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
