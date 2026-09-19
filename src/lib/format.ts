export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

export function companyColor(name: string): string {
  const palette = [
    "#E11D2E",
    "#03C75A",
    "#FEE500",
    "#FA622F",
    "#3182F6",
    "#111111",
    "#6B4EFF",
    "#00C4B4",
  ];
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function companyInitial(label: string): string {
  const company = label.split("·")[0]?.trim() ?? label;
  return company.slice(0, 1);
}
