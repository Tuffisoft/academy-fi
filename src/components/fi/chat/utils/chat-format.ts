const time = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
});
const day = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
export const messageTime = (value: string) => time.format(new Date(value));
export const messageDay = (value: string) => day.format(new Date(value));
export function dayLabel(value: string) {
  const date = messageDay(value);
  if (date === day.format(new Date())) return "Heute";
  if (date === day.format(new Date(Date.now() - 86400000))) return "Gestern";
  return date;
}
