/**
 * One icon set for the whole site: Lucide (lucide-react 1.56.0, ISC), stroke 1.75, two sizes (16 / 20).
 * Named imports only — Next 15 optimizes lucide-react imports, so only these icons are bundled.
 */
import {
  ArrowLeft,
  ArrowUpRight,
  Atom,
  BadgeCheck,
  Briefcase,
  Calendar,
  Cpu,
  CornerDownLeft,
  Globe,
  HeartPulse,
  Info,
  Landmark,
  Layers,
  LayoutGrid,
  Leaf,
  Map as MapGlyph,
  MapPin,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Shapes,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

export const STROKE = 1.75;
export type IconSize = 16 | 20;

export const Icons = {
  arrowLeft: ArrowLeft,
  arrowUpRight: ArrowUpRight,
  badgeCheck: BadgeCheck,
  briefcase: Briefcase,
  calendar: Calendar,
  enter: CornerDownLeft,
  globe: Globe,
  info: Info,
  grid: LayoutGrid,
  map: MapGlyph,
  mapPin: MapPin,
  minus: Minus,
  moon: Moon,
  plus: Plus,
  reset: RotateCcw,
  search: Search,
  shapes: Shapes,
  sliders: SlidersHorizontal,
  sun: Sun,
  trendingUp: TrendingUp,
  users: Users,
  wallet: Wallet,
  x: X,
} satisfies Record<string, LucideIcon>;

/** Sector id -> icon (chips, legend, map list). */
export const SECTOR_ICONS: Record<string, LucideIcon> = {
  fintech: Landmark,
  saas: Layers,
  ai: Cpu,
  health: HeartPulse,
  consumer: ShoppingBag,
  climate: Leaf,
  logistics: Truck,
  deeptech: Atom,
};

export function Icon({ icon: I, size = 16, className }: { icon: LucideIcon; size?: IconSize; className?: string }) {
  return <I size={size} strokeWidth={STROKE} aria-hidden="true" focusable="false" className={className} />;
}

export function SectorIcon({ id, size = 16, className }: { id: string; size?: IconSize; className?: string }) {
  const I = SECTOR_ICONS[id] ?? Layers;
  return <I size={size} strokeWidth={STROKE} aria-hidden="true" focusable="false" className={className} />;
}
