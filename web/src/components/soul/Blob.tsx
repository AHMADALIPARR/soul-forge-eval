import { useId } from "react";

export function hashId(id: string) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function blobPath(id: string, points = 7) {
  const hash = hashId(id);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const radius = 34 + (((hash >>> (i * 4)) & 15) / 15) * 10;
    pts.push([50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius]);
  }
  let path = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % points];
    const p3 = pts[(i + 2) % points];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    path += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return `${path}Z`;
}

export function AgentBlob({
  id,
  activity = "idle",
  size = 40,
}: {
  id: string;
  activity?: string;
  size?: number;
}) {
  const hue = hashId(id) % 360;
  const gid = `sfb-${hashId(id).toString(36)}-${useId().replace(/:/g, "")}`;
  return (
    <span className="sf-blob" data-activity={activity} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" width={size} height={size} focusable="false">
        <defs>
          <radialGradient id={gid} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={`hsl(${hue} 90% 92%)`} />
            <stop offset="60%" stopColor={`hsl(${hue} 70% 78%)`} />
            <stop offset="100%" stopColor={`hsl(${(hue + 40) % 360} 60% 70%)`} />
          </radialGradient>
        </defs>
        <path className="sf-blob-shape" d={blobPath(id)} fill={`url(#${gid})`} />
      </svg>
    </span>
  );
}
