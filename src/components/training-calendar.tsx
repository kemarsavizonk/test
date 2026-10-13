"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, addMonths, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

export function TrainingCalendar({ selectedDate, trainingDates, onSelect, onClose }: { selectedDate: string; trainingDates: Set<string>; onSelect: (date: string) => void; onClose: () => void }) {
  const [month, setMonth] = useState(new Date(`${selectedDate}T12:00:00`));
  const root = useRef<HTMLDivElement>(null);
  const firstDay = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, index) => addDays(firstDay, index));
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    root.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node) && !(event.target as HTMLElement).closest(".dashboard-date-trigger")) onClose(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [onClose]);

  return <div ref={root} className="training-calendar" role="dialog" aria-label="Choose training date">
    <div className="training-calendar-heading"><Button variant="ghost" aria-label="Previous calendar month" onClick={() => setMonth((date) => addMonths(date, -1))}><ChevronLeft size={19} /></Button><strong aria-live="polite">{format(month, "MMMM yyyy")}</strong><Button variant="ghost" aria-label="Next calendar month" onClick={() => setMonth((date) => addMonths(date, 1))}><ChevronRight size={19} /></Button></div>
    <div className="training-calendar-weekdays" aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={index}>{day}</span>)}</div>
    <div className="training-calendar-days">{days.map((date) => {
      const key = format(date, "yyyy-MM-dd");
      return <button key={key} type="button" aria-label={format(date, "EEEE, MMMM d, yyyy")} aria-pressed={key === selectedDate} aria-current={key === today ? "date" : undefined} className={`${key === selectedDate ? "selected" : ""} ${!isSameMonth(month, date) ? "outside-month" : ""}`} onClick={() => onSelect(key)}><span>{format(date, "d")}</span>{trainingDates.has(key) && <i aria-label="Workout logged" />}</button>;
    })}</div>
    <div className="training-calendar-footer"><span><i /> Trained</span><Button variant="ghost" onClick={() => onSelect(today)}>Today</Button><Button variant="ghost" onClick={onClose}>Close</Button></div>
  </div>;
}
