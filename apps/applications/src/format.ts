const calendarDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Formats a `YYYY-MM-DD` answer without shifting it into the viewer's time zone. */
export function formatCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : calendarDate.format(date);
}
