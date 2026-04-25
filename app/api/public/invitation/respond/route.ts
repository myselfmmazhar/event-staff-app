import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { CallTimeService } from '@/services/call-time.service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const action = searchParams.get('action');

  if (!token || !action || (action !== 'accept' && action !== 'reject')) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const service = new CallTimeService(prisma);
    const result = await service.respondToInvitationByToken(token, action as 'accept' | 'reject');

    // Redirect to a public results page or return a simple HTML response
    // For now, let's redirect to a public page we'll create
    const url = new URL('/invitation/result', request.url);
    url.searchParams.set('status', result.status);
    url.searchParams.set('event', result.eventTitle);
    url.searchParams.set('position', result.positionName);
    if (result.alreadyResponded) url.searchParams.set('already', 'true');
    if (result.isConfirmed) url.searchParams.set('confirmed', 'true');

    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error('Error responding to invitation via token:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
