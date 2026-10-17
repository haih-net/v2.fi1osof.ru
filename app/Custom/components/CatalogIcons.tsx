import type * as React from 'react'

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number }
const Icon: React.FC<IconProps> = ({ size = 24, children, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
)
export const ArrowRight: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </Icon>
)
export const ArrowUpRight: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M7 17 17 7M7 7h10v10" />
  </Icon>
)
export const ChevronLeft: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="m15 18-6-6 6-6" />
  </Icon>
)
export const ChevronRight: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
)
export const Search: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </Icon>
)
export const MapPin: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
)
export const Globe2: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <ellipse cx="12" cy="12" rx="4" ry="10" />
    <path d="M2 12h20" />
  </Icon>
)
export const Sparkles: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3ZM5 3v4M3 5h4m12 12v4m-2-2h4" />
  </Icon>
)
