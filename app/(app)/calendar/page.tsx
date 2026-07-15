"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { api } from "@/lib/api-client";

type CalendarEventType = "meeting" | "announcement" | "holiday" | "task" | "event";

type CalendarEventItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  type: CalendarEventType;
  href?: string;
};

const TYPE_COLORS: Record<CalendarEventType, { bg: string; border: string; text: string }> = {
  meeting: { bg: "#0d7377", border: "#0a5f62", text: "#ffffff" },
  announcement: { bg: "#0b6e99", border: "#085578", text: "#ffffff" },
  holiday: { bg: "#b45309", border: "#92400e", text: "#ffffff" },
  task: { bg: "#6d28d9", border: "#5b21b6", text: "#ffffff" },
  event: { bg: "#0f766e", border: "#0d5f59", text: "#ffffff" },
};

export default function CalendarPage() {
  const router = useRouter();
  const [items, setItems] = useState<CalendarEventItem[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from, to });
      const data = await api<{ items: CalendarEventItem[] }>(`/api/v1/calendar?${qs}`);
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!range) return;
    load(range.from, range.to).catch(console.error);
  }, [range, load]);

  const events = useMemo<EventInput[]>(
    () =>
      items.map((item) => {
        const colors = TYPE_COLORS[item.type];
        return {
          id: item.id,
          title: item.title,
          start: item.start,
          end: item.end,
          allDay: item.allDay,
          url: item.href,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          extendedProps: { type: item.type, href: item.href },
        };
      }),
    [items],
  );

  function onDatesSet(arg: DatesSetArg) {
    const from = arg.start.toISOString();
    const to = arg.end.toISOString();
    setRange((prev) => {
      if (prev?.from === from && prev?.to === to) return prev;
      return { from, to };
    });
  }

  function onEventClick(info: EventClickArg) {
    const href = info.event.extendedProps.href as string | undefined;
    if (!href) {
      info.jsEvent.preventDefault();
      return;
    }
    info.jsEvent.preventDefault();
    router.push(href);
  }

  return (
    <div className="berc-calendar flex h-full min-h-0 flex-col bg-[var(--surface)]">
      <div className="relative min-h-0 flex-1 p-3 md:p-4">
        {loading ? (
          <p className="pointer-events-none absolute right-5 top-5 z-10 text-xs font-medium text-[var(--muted-fg)]">
            Updating…
          </p>
        ) : null}
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          buttonText={{
            today: "Today",
            month: "Month",
            week: "Week",
            day: "Day",
            list: "Agenda",
          }}
          height="100%"
          nowIndicator
          editable={false}
          selectable={false}
          dayMaxEvents={3}
          navLinks
          weekends
          events={events}
          datesSet={onDatesSet}
          eventClick={onEventClick}
          eventDisplay="block"
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          allDayText="All day"
        />
      </div>
    </div>
  );
}
