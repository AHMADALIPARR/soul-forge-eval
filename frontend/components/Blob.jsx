import React from 'react'

/**
 * AgentBlob — the crew's deterministic soft blob per agent id, kept as
 * pure presentation. Shape and hue derive from a hash of the id, so
 * each agent keeps a stable, distinct look. Rendered at build time;
 * the animation is CSS (styles.css), never script.
 */
export function hashId(id) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export function blobPath(id, points = 7) {
  const h = hashId(id)
  const pts = []
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2
    const r = 34 + (((h >>> (i * 4)) & 15) / 15) * 10
    pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r])
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points], p1 = pts[i], p2 = pts[(i + 1) % points], p3 = pts[(i + 2) % points]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d + 'Z'
}

export function AgentBlob({ id, activity = 'idle', size = 40 }) {
  const hue = hashId(id) % 360
  const gid = `sfb-${hashId(id).toString(36)}`
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
  )
}
