// Line icons drawn for AstroSalud (24 x 24, stroke = currentColor).
// Decorative by default: pair them with visible text.

const PATHS = {
  home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M10 21v-6h4v6'],
  vitals: ['M3 12h4l3-8 4 16 3-8h4'],
  bell: ['M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z', 'M10 20a2 2 0 0 0 4 0'],
  checkin: ['M7 4h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M9 4V3h6v1', 'M9 11h6', 'M9 15h4'],
  sensors: ['M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'M8.5 15.5a5 5 0 0 1 0-7', 'M15.5 8.5a5 5 0 0 1 0 7', 'M5.6 18.4a9 9 0 0 1 0-12.8', 'M18.4 5.6a9 9 0 0 1 0 12.8'],
  comms: ['M4 5h16v11H9l-5 4z', 'M8 9h8', 'M8 12h5'],
  crew: ['M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M2.5 20a6.5 6.5 0 0 1 13 0', 'M16 4.5a3.5 3.5 0 0 1 0 7', 'M18 14.5a6.5 6.5 0 0 1 3.5 5.5'],
  sun: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  logout: ['M15 4h4v16h-4', 'M10 8l-4 4 4 4', 'M6 12h10'],
  chevronRight: ['M9 6l6 6-6 6'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  // Body systems
  cardiovascular: ['M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z', 'M7 12h2l1.5-2 2 4 1.5-2h3'],
  musculoskeletal: ['M6 7v10', 'M18 7v10', 'M3 9.5v5', 'M21 9.5v5', 'M6 12h12'],
  immune: ['M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z', 'M9.5 12l2 2 3.5-4'],
  behavioral: ['M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1.5V4z', 'M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1.5V4z'],
  radiation: ['M12 13.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z', 'M10.6 11.2 7.4 5.7A7.4 7.4 0 0 0 4.6 12h6.4', 'M13 12h6.4a7.4 7.4 0 0 0-2.8-6.3l-3.2 5.5', 'M12.8 13.4l3.2 5.6a7.4 7.4 0 0 1-8 0l3.2-5.6'],
  // Vital signs
  lungs: ['M12 4v8', 'M12 11l-3 2', 'M12 11l3 2', 'M9 8c-3 0-5 5-5 9 0 2 1.5 3 3 2.5S9 18 9 16z', 'M15 8c3 0 5 5 5 9 0 2-1.5 3-3 2.5S15 18 15 16z'],
  thermometer: ['M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z', 'M12 9v8'],
}

/**
 * @param {Object} props
 * @param {keyof typeof PATHS} props.name
 * @param {number} [props.size=22]
 */
export default function Icon({ name, size = 22, className = '' }) {
  const paths = PATHS[name] ?? PATHS.vitals
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
