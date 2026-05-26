import { cn } from '@/lib/utils';
import type { SkillCategory } from '@/types/skill';

const CATEGORY_STYLES: Record<SkillCategory, { label: string; className: string }> = {
  persona: { label: 'Persona', className: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  sales: { label: 'Sales', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  service: { label: 'Service', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  specialty: { label: 'Specialty', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
};

export function CategoryBadge({ category, className }: { category: SkillCategory; className?: string }) {
  const style = CATEGORY_STYLES[category];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        style.className,
        className
      )}
    >
      {style.label}
    </span>
  );
}
