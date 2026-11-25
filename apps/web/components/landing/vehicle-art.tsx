export function VehicleArt({ type }: { type: "boda" | "bajaji" | "car" }) {
  if (type === "boda") {
    return (
      <svg viewBox="0 0 300 170" fill="none" aria-hidden="true" className="h-full w-full">
        <ellipse cx="150" cy="144" rx="100" ry="10" fill="#101B17" fillOpacity="0.07" />
        <circle cx="92" cy="124" r="27" stroke="#101B17" strokeWidth="5" />
        <circle cx="92" cy="124" r="8" stroke="#101B17" strokeWidth="4" />
        <circle cx="212" cy="124" r="27" stroke="#101B17" strokeWidth="5" />
        <circle cx="212" cy="124" r="8" stroke="#101B17" strokeWidth="4" />
        <path d="M92 124L128 95L172 95L212 124" stroke="#087A4B" strokeWidth="5" strokeLinecap="round" />
        <path d="M128 95L142 63L180 63L204 97" stroke="#101B17" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M142 63L132 50H116" stroke="#101B17" strokeWidth="5" strokeLinecap="round" />
        <path d="M180 63L194 48L220 48" stroke="#101B17" strokeWidth="5" strokeLinecap="round" />
        <rect x="139" y="84" width="46" height="22" rx="8" fill="#13A86B" />
        <path d="M152 90H174" stroke="#B8ED76" strokeWidth="3" strokeLinecap="round" />
        <circle cx="172" cy="108" r="5" fill="#B8ED76" />
        <path d="M124 102L108 96" stroke="#101B17" strokeWidth="4" strokeLinecap="round" />
        <path d="M214 104L224 95" stroke="#101B17" strokeWidth="4" strokeLinecap="round" />
        <path d="M54 111C37 103 28 114 20 126" stroke="#B8ED76" strokeWidth="3" strokeLinecap="round" />
        <path d="M64 45C82 32 104 28 123 33" stroke="#B8ED76" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "bajaji") {
    return (
      <svg viewBox="0 0 300 170" fill="none" aria-hidden="true" className="h-full w-full">
        <ellipse cx="152" cy="144" rx="106" ry="10" fill="#101B17" fillOpacity="0.07" />
        <path d="M58 120V84C58 70 66 58 80 51L125 31C137 25 150 34 150 47V58H186L218 96V120" fill="#101B17" />
        <path d="M68 118V87C68 77 73 69 83 64L124 45C130 42 138 47 138 55V55H170L204 88V118H68Z" fill="#13A86B" />
        <path d="M83 63L118 47V59H78C79 60 81 61 83 63Z" fill="#B8ED76" fillOpacity="0.9" />
        <path d="M145 63H179L202 88H145V63Z" fill="#EAF5EC" />
        <path d="M157 68V84H195" stroke="#9AB9A7" strokeWidth="2" />
        <circle cx="99" cy="124" r="24" stroke="#101B17" strokeWidth="5" />
        <circle cx="99" cy="124" r="8" fill="#101B17" />
        <circle cx="213" cy="124" r="24" stroke="#101B17" strokeWidth="5" />
        <circle cx="213" cy="124" r="8" fill="#101B17" />
        <path d="M64 94H95" stroke="#B8ED76" strokeWidth="3" strokeLinecap="round" />
        <rect x="117" y="77" width="26" height="17" rx="4" fill="#087A4B" />
        <circle cx="130" cy="85" r="5" fill="#B8ED76" />
        <path d="M204 118H230C236 118 240 121 243 126" stroke="#101B17" strokeWidth="4" strokeLinecap="round" />
        <path d="M119 38C134 31 151 37 161 49" stroke="#B8ED76" strokeWidth="3" strokeLinecap="round" />
        <circle cx="252" cy="120" r="4" fill="#B8ED76" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 300 170" fill="none" aria-hidden="true" className="h-full w-full">
      <ellipse cx="150" cy="146" rx="112" ry="10" fill="#101B17" fillOpacity="0.07" />
      <path d="M42 121L60 84C65 74 75 68 86 68H196C208 68 217 73 223 82L252 121H268V130H32V121H42Z" fill="#101B17" />
      <path d="M52 119L67 88C70 81 77 77 85 77H115L103 119H52Z" fill="#13A86B" />
      <path d="M108 77H164V119H101L108 77Z" fill="#EAF5EC" />
      <path d="M174 77H194C203 77 209 80 214 87L233 119H174V77Z" fill="#EAF5EC" />
      <path d="M112 83L104 108H154V83H112Z" fill="#D4E7DB" />
      <path d="M164 83V108H196L181 83H164Z" fill="#D4E7DB" />
      <path d="M169 82V108" stroke="#101B17" strokeWidth="3" />
      <path d="M155 119H174" stroke="#B8ED76" strokeWidth="3" strokeLinecap="round" />
      <rect x="221" y="91" width="12" height="7" rx="3.5" fill="#B8ED76" />
      <rect x="46" y="95" width="12" height="7" rx="3.5" fill="#B8ED76" />
      <circle cx="86" cy="126" r="21" stroke="#101B17" strokeWidth="5" />
      <circle cx="86" cy="126" r="8" fill="#101B17" />
      <circle cx="216" cy="126" r="21" stroke="#101B17" strokeWidth="5" />
      <circle cx="216" cy="126" r="8" fill="#101B17" />
      <path d="M122 58C144 48 172 50 192 58" stroke="#B8ED76" strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="122" r="4" fill="#B8ED76" />
    </svg>
  );
}
