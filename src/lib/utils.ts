export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const day = Math.floor(diff / 86400000);
  if (day <= 0) return "오늘";
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  return `${Math.floor(day / 7)}주 전`;
}
