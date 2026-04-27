'use client';

import { StaffType } from '@prisma/client';
import { cn } from '@/lib/utils';
import { REQ_TEMPLATE_CARDS, type ReqTemplateId } from '@/lib/requirement-templates';

export interface RequirementTemplateCardGridProps {
  selected: ReadonlySet<ReqTemplateId>;
  onToggle: (id: ReqTemplateId) => void;
  disabled?: boolean;
  /** Used only to relabel the W-9 card as W-4 for employees. */
  staffType?: StaffType;
  /** Match the slate styling used inside the staff wizard dialog. */
  staffAppearance?: boolean;
  /** Single-select mode (e.g. catalog requirement wizard). */
  selectionMode?: 'multi' | 'single';
  singleSelected?: ReqTemplateId | null;
  onSingleChange?: (id: ReqTemplateId | null) => void;
  /** When set, only these template ids are shown (order preserved from REQ_TEMPLATE_CARDS). */
  visibleIds?: readonly ReqTemplateId[];
}

export function RequirementTemplateCardGrid({
  selected,
  onToggle,
  disabled = false,
  staffType = StaffType.CONTRACTOR,
  staffAppearance = false,
  selectionMode = 'multi',
  singleSelected = null,
  onSingleChange,
  visibleIds,
}: RequirementTemplateCardGridProps) {
  const visibleSet = visibleIds?.length ? new Set(visibleIds) : null;
  const cards = REQ_TEMPLATE_CARDS.filter((c) => !visibleSet || visibleSet.has(c.id));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const isSelected =
          selectionMode === 'single'
            ? singleSelected === card.id
            : selected.has(card.id);
        const Icon = card.Icon;
        const title =
          card.id === 'w9'
            ? staffType === StaffType.EMPLOYEE || staffType === StaffType.TEAM
              ? 'Tax form - W-4'
              : 'Tax form - W-9'
            : card.title;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => {
              if (selectionMode === 'single' && onSingleChange) {
                onSingleChange(singleSelected === card.id ? null : card.id);
              } else {
                onToggle(card.id);
              }
            }}
            disabled={disabled}
            className={cn(
              'flex flex-col rounded-xl border p-4 text-left transition-shadow',
              staffAppearance ? 'bg-white' : 'bg-card',
              isSelected
                ? staffAppearance
                  ? 'border-slate-900 shadow-sm ring-1 ring-slate-900/10'
                  : 'border-foreground shadow-sm ring-1 ring-foreground/10'
                : staffAppearance
                  ? 'border-slate-200 hover:border-slate-300'
                  : 'border-border hover:border-muted-foreground/30'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  'text-sm font-bold',
                  staffAppearance ? 'text-slate-900' : 'text-foreground'
                )}
              >
                {title}
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  card.badge === 'Smart' ? 'bg-sky-100 text-sky-800' : staffAppearance ? 'bg-slate-100 text-slate-700' : 'bg-muted text-muted-foreground'
                )}
              >
                {card.badge}
              </span>
            </div>
            <p
              className={cn(
                'mt-2 flex-1 text-xs leading-relaxed',
                staffAppearance ? 'text-slate-500' : 'text-muted-foreground'
              )}
            >
              {card.description}
            </p>
            <div
              className={cn(
                'mt-4 flex h-24 items-center justify-center rounded-lg',
                staffAppearance ? 'bg-slate-100/90' : 'bg-muted/80'
              )}
            >
              <Icon
                className={cn(
                  'h-10 w-10',
                  staffAppearance ? 'text-slate-400' : 'text-muted-foreground/70'
                )}
                strokeWidth={1.25}
              />
            </div>
            <p
              className={cn(
                'mt-3 text-xs font-bold',
                staffAppearance ? 'text-slate-900' : 'text-foreground'
              )}
            >
              {card.footer}
            </p>
          </button>
        );
      })}
    </div>
  );
}
