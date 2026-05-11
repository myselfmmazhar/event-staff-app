'use client';

import Link from 'next/link';
import { useState } from 'react';
import { trpc } from '@/lib/client/trpc';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { REQ_TEMPLATE_CARDS } from '@/lib/requirement-templates';

function getRequirementTitle(id: string): string {
    return REQ_TEMPLATE_CARDS.find((c) => c.id === id)?.title ?? id;
}

function daysUntil(date: Date | string): number {
    const target = new Date(date).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

function formatDateShort(d: Date | string): string {
    return new Date(d).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function DocumentExpiryBanner() {
    const { data: expiring = [] } = trpc.staffDocument.getMyExpiring.useQuery(
        undefined,
        {
            // Polled lightly so admins approving updates clears the banner
            refetchOnWindowFocus: true,
            staleTime: 1000 * 60 * 5,
        },
    );
    const [expanded, setExpanded] = useState(false);

    if (expiring.length === 0) return null;

    const first = expiring[0];
    if (!first || !first.expiresAt) return null;
    const firstExpiresAt = first.expiresAt;
    const remaining = expiring.length - 1;

    return (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-amber-900">
            <div className="flex flex-wrap items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                    {expiring.length === 1 ? (
                        <p className="text-sm">
                            Your <strong>{getRequirementTitle(first.requirementTemplateId)}</strong>
                            {' '}
                            (<span className="font-medium">{first.name}</span>) expires on{' '}
                            <strong>{formatDateShort(firstExpiresAt)}</strong>{' '}
                            ({daysUntil(firstExpiresAt)} day
                            {daysUntil(firstExpiresAt) === 1 ? '' : 's'}). Please upload an
                            updated copy.{' '}
                            <Link
                                href="/profile"
                                className="underline font-semibold hover:no-underline"
                            >
                                Upload Update
                            </Link>
                        </p>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="flex items-center gap-1 text-sm"
                                onClick={() => setExpanded((v) => !v)}
                            >
                                <span>
                                    <strong>{expiring.length} documents</strong> are expiring
                                    soon — the next is{' '}
                                    <strong>
                                        {getRequirementTitle(first.requirementTemplateId)}
                                    </strong>{' '}
                                    on <strong>{formatDateShort(firstExpiresAt)}</strong>.
                                </span>
                                {expanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </button>
                            {expanded && (
                                <ul className="mt-2 ml-4 list-disc text-sm">
                                    {expiring.map((doc) => (
                                        <li key={doc.id}>
                                            <strong>
                                                {getRequirementTitle(doc.requirementTemplateId)}
                                            </strong>{' '}
                                            — {doc.name} expires{' '}
                                            {formatDateShort(doc.expiresAt!)} (
                                            {daysUntil(doc.expiresAt!)} day
                                            {daysUntil(doc.expiresAt!) === 1 ? '' : 's'})
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <Link
                                href="/profile"
                                className="mt-1 inline-block text-sm underline font-semibold hover:no-underline"
                            >
                                Manage Documents
                            </Link>
                            {remaining > 0 && !expanded && (
                                <span className="ml-2 text-xs text-amber-700">
                                    +{remaining} more
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
