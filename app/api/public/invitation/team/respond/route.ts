import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { CallTimeService } from '@/services/call-time.service';

/**
 * POST handler for a Team Manager submitting their team-invitation response.
 * Form fields: token, action ('accept' | 'reject'), teamUnitId (required when accepting)
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = formData.get('token')?.toString();
  const action = formData.get('action')?.toString();
  const teamUnitId = formData.get('teamUnitId')?.toString();

  if (!token || !action || (action !== 'accept' && action !== 'reject')) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const service = new CallTimeService(prisma);

    if (action === 'reject') {
      // Reuse the standard decline path
      const result = await service.respondToInvitationByToken(token, 'reject');
      const url = new URL('/invitation/result', request.url);
      url.searchParams.set('status', result.status);
      url.searchParams.set('event', result.eventTitle);
      url.searchParams.set('position', result.positionName);
      return NextResponse.redirect(url, { status: 303 });
    }

    if (!teamUnitId) {
      const back = new URL('/invitation/team-respond', request.url);
      back.searchParams.set('token', token);
      back.searchParams.set('error', 'unit-required');
      return NextResponse.redirect(back, { status: 303 });
    }

    const result = await service.acceptTeamInvitationByToken(token, teamUnitId);
    const url = new URL('/invitation/result', request.url);
    url.searchParams.set('status', result.status);
    url.searchParams.set('event', result.eventTitle);
    url.searchParams.set('position', result.positionName);
    if (result.alreadyResponded) url.searchParams.set('already', 'true');
    if (result.isConfirmed) url.searchParams.set('confirmed', 'true');
    if (result.teamUnitName) url.searchParams.set('unit', result.teamUnitName);
    return NextResponse.redirect(url, { status: 303 });
  } catch (error: any) {
    console.error('Error responding to team invitation via token:', error);
    const back = new URL('/invitation/team-respond', request.url);
    back.searchParams.set('token', token);
    back.searchParams.set('error', encodeURIComponent(error.message || 'An error occurred'));
    return NextResponse.redirect(back, { status: 303 });
  }
}
