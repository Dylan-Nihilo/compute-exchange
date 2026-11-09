"use client";

import {SectionQueryState} from "@/components/managed/query-states";
import {
  addDays,
  isNightStartSelectable,
  type NightBookingBounds,
  type NightCalendarDay,
} from "@/lib/nightly";

const weekday = new Intl.DateTimeFormat("zh-CN", {weekday: "short", timeZone: "UTC"});

function dayLabel(date: string) {
  const [, month, day] = date.split("-");
  return {short: `${Number(month)}/${Number(day)}`, weekday: weekday.format(new Date(`${date}T00:00:00Z`))};
}

/**
 * Start-night picker for nightly orders (GET /products/:id/night-calendar). A night is disabled when its
 * per-node `max_cards` is below the chosen card count or it lies outside the bookable start range;
 * nights inside the selected [start, start+nights) range are highlighted.
 */
export function NightCalendarPicker({
  calendar,
  query,
  cards,
  bounds,
  start,
  nights,
  onSelect,
}: {
  calendar: readonly NightCalendarDay[] | undefined;
  query: {error: unknown; isError: boolean; isPending: boolean; isFetching: boolean; refetch: () => unknown};
  cards: number;
  bounds: NightBookingBounds;
  start: string | null;
  nights: number;
  onSelect: (date: string) => void;
}) {
  const end = start ? addDays(start, nights - 1) : null;
  const selectable = calendar?.filter((day) => isNightStartSelectable(day, cards, bounds)) ?? [];
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted" id="night-calendar-label">起始夜晚（按每晚同机空闲卡数）</span>
      <SectionQueryState
        emptyText="未来 30 晚暂无可预订的夜晚。"
        error={query.error}
        isEmpty={Boolean(calendar) && selectable.length === 0}
        isError={query.isError}
        isPending={query.isPending}
        isRefetching={query.isFetching}
        loadingText="正在读取包夜日历"
        notOpenText="包夜日历暂未开放，暂不可预订包夜。"
        onRetry={() => void query.refetch()}
      >
        <div aria-labelledby="night-calendar-label" className="grid grid-cols-5 gap-1.5 sm:grid-cols-7 lg:grid-cols-5" role="group">
          {(calendar ?? []).map((day) => {
            const label = dayLabel(day.night_date);
            const enabled = isNightStartSelectable(day, cards, bounds);
            const isStart = day.night_date === start;
            const inRange = Boolean(start && end && day.night_date >= start && day.night_date <= end);
            return (
              <button
                aria-label={`${day.night_date} 晚，${day.max_cards > 0 ? `单机最多 ${day.max_cards} 卡` : "不可订"}`}
                aria-pressed={isStart}
                className={`flex flex-col items-center rounded-lg px-1 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 ${
                  isStart
                    ? "bg-[#173447] text-white"
                    : inRange
                      ? "border border-[#173447] bg-[#e7eef2] text-foreground"
                      : "border border-border bg-surface text-foreground hover:border-[#afc4ce]"
                }`}
                disabled={!enabled}
                key={day.night_date}
                onClick={() => onSelect(day.night_date)}
                type="button"
              >
                <span className="font-medium tabular-nums">{label.short}</span>
                <span className={isStart ? "text-white/80" : "text-muted"}>{label.weekday}</span>
                <span className={`tabular-nums ${isStart ? "text-white/80" : "text-muted"}`}>{day.max_cards > 0 ? `${day.max_cards} 卡` : "—"}</span>
              </button>
            );
          })}
        </div>
        {start && end ? (
          <p className="text-xs text-muted" role="status">
            已选 {start} 晚起连续 {nights} 晚（至 {end} 晚）；日历仅反映每晚余量，同一组卡能否每晚连续预订以下方报价为准。
          </p>
        ) : null}
      </SectionQueryState>
    </div>
  );
}
