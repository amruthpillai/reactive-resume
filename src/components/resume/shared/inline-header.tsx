import { cn } from "@/utils/style";

type InlineHeaderProps = {
  /** Leading (start) column — typically the position/major. */
  leading?: React.ReactNode;
  /** Middle column — typically the company/school (primary title). */
  middle?: React.ReactNode;
  /** Trailing (end) column — typically the period/date. Kept at auto width. */
  trailing?: React.ReactNode;
  className?: string;
};

/**
 * A three-column inline header used by templates that prefer a compact,
 * single-line entry header (common in Asian resume conventions where
 * position/major · organization · period are traditionally laid out on
 * the same line).
 *
 * Layout: [leading] [middle] [trailing]
 * - leading / middle: flexible, `minmax(0, 1fr)` so they shrink/grow together
 *   and wrap naturally when content is too long to fit on one line. Wrapping
 *   preserves the three-column alignment because all columns share the same
 *   grid row and are top-aligned via `items-start`.
 * - trailing: `auto` width, end-aligned — suitable for short strings like
 *   periods/dates that should stay on one line.
 */
export function InlineHeader({ leading, middle, trailing, className }: InlineHeaderProps) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-x-3", className)}>
      <div className="min-w-0">{leading}</div>
      <div className="min-w-0">{middle}</div>
      <div className="shrink-0 text-end">{trailing}</div>
    </div>
  );
}
