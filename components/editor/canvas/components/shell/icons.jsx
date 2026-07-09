/* Inline line icons matching the reference editor (stroke = currentColor). */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const IconDesigns = (p) => (
  <svg {...base} {...p}>
    {/* cup of art supplies */}
    <path d="M5 11h11l-1 9H6l-1-9Z" />
    <path d="M8 11V6.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M13 11V8a2 2 0 0 1 4 0v3" />
    <path d="M16 6l2-2" />
  </svg>
)

export const IconUpload = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="14" rx="2" />
    <path d="M3 15l4-4 3 3 4-5 4 5" />
    <circle cx="8" cy="8.5" r="1.3" />
    <path d="M16 21v-6m0 0-2.2 2.2M16 15l2.2 2.2" />
  </svg>
)

export const IconText = (p) => (
  <svg {...base} {...p}>
    <path d="M5 7V5h14v2" />
    <path d="M12 5v14" />
    <path d="M9 19h6" />
  </svg>
)

export const IconIdeas = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="M8 10h8M8 13h5" />
  </svg>
)

export const IconInfo = (p) => (
  <svg {...base} {...p} strokeWidth={1.8}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
)
