"use client";

import type { LatLng } from "@lenzi/shared";
import { cn } from "@/lib/utils";

const BOUNDS = { north: -8.44, south: -8.63, west: 33.32, east: 33.51 };
const W = 480;
const H = 400;

function project(point: LatLng): { x: number; y: number } {
  const x = ((point.lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * W;
  const y = ((BOUNDS.north - point.lat) / (BOUNDS.north - BOUNDS.south)) * H;
  return { x, y };
}

/**
 * Illustrative picker for the Chunya pilot. It is intentionally labelled as
 * non-navigational: precise routing requires configured map tiles. The backend
 * still validates the coordinates and computes the authoritative distance.
 */
export function ChunyaMap({
  pickup,
  dropoff,
  onPick,
  className,
}: {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  onPick?: (point: LatLng) => void;
  className?: string;
}) {
  const pickupPoint = pickup ? project(pickup) : null;
  const dropoffPoint = dropoff ? project(dropoff) : null;

  function handleClick(event: React.MouseEvent<SVGSVGElement>) {
    if (!onPick) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const y = ((event.clientY - rect.top) / rect.height) * H;
    const lng = BOUNDS.west + (x / W) * (BOUNDS.east - BOUNDS.west);
    const lat = BOUNDS.north - (y / H) * (BOUNDS.north - BOUNDS.south);
    onPick({
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
    });
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-sage-200 bg-[#eaf0eb]",
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={cn("h-full w-full", onPick && "cursor-crosshair")}
        onClick={handleClick}
        role={onPick ? "button" : "img"}
        aria-label="Illustrative map of the Chunya service area. Tap to place a drop-off pin."
      >
        <defs>
          <pattern id="lenzi-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d6e2d9" strokeWidth="1" />
          </pattern>
          <linearGradient id="lenzi-land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f2f7f2" />
            <stop offset="100%" stopColor="#e4ede6" />
          </linearGradient>
        </defs>

        <rect width={W} height={H} fill="url(#lenzi-land)" />
        <rect width={W} height={H} fill="url(#lenzi-grid)" />

        <path
          d="M -20 290 C 90 250, 140 320, 240 300 S 400 260, 520 300"
          fill="none"
          stroke="#cfe0e8"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M 60 -20 C 90 90, 60 160, 120 230 S 190 330, 210 430"
          fill="none"
          stroke="#ffffff"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M -20 120 C 120 140, 200 90, 300 130 S 420 180, 520 140"
          fill="none"
          stroke="#ffffff"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M 340 -20 C 320 100, 360 200, 330 300 S 360 380, 380 430"
          fill="none"
          stroke="#ffffff"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <circle
          cx={project({ lat: -8.5333, lng: 33.4167 }).x}
          cy={project({ lat: -8.5333, lng: 33.4167 }).y}
          r="86"
          fill="#13a86b"
          fillOpacity="0.06"
          stroke="#13a86b"
          strokeOpacity="0.3"
          strokeDasharray="6 6"
        />
        <text
          x={project({ lat: -8.5333, lng: 33.4167 }).x}
          y={project({ lat: -8.5333, lng: 33.4167 }).y + 112}
          textAnchor="middle"
          className="fill-graphite-400"
          fontSize="11"
          fontWeight="700"
          letterSpacing="2"
        >
          CHUNYA
        </text>

        {pickupPoint && dropoffPoint && (
          <line
            x1={pickupPoint.x}
            y1={pickupPoint.y}
            x2={dropoffPoint.x}
            y2={dropoffPoint.y}
            stroke="#101b17"
            strokeWidth="2.5"
            strokeDasharray="7 6"
            strokeLinecap="round"
          />
        )}

        {pickupPoint && (
          <g>
            <circle cx={pickupPoint.x} cy={pickupPoint.y} r="13" fill="#13a86b" fillOpacity="0.18" />
            <circle cx={pickupPoint.x} cy={pickupPoint.y} r="6" fill="#13a86b" stroke="#fff" strokeWidth="2.5" />
          </g>
        )}

        {dropoffPoint && (
          <g>
            <circle cx={dropoffPoint.x} cy={dropoffPoint.y} r="13" fill="#101b17" fillOpacity="0.14" />
            <circle cx={dropoffPoint.x} cy={dropoffPoint.y} r="6" fill="#101b17" stroke="#b8ed76" strokeWidth="2.5" />
          </g>
        )}
      </svg>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-graphite-500 backdrop-blur">
          Illustrative map · not for navigation
        </span>
        <span className="rounded-full bg-forest-950/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-lime backdrop-blur">
          Chunya pilot
        </span>
      </div>
    </div>
  );
}
