/** "เหลือ 9 ชม. 30 นาที" until a deadline, counted from `now`. */
export function timeLeft(deadline: string, now: Date = new Date()): string {
  const minutes = Math.floor((Date.parse(deadline) - now.getTime()) / 60000);
  if (minutes <= 0) return "หมดเวลาแล้ว";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `เหลือ ${h} ชม. ${m} นาที` : `เหลือ ${m} นาที`;
}
