import { Award, ClipboardList, MapPinned, Package, Phone, Puzzle, Receipt, Sparkles, Star, type LucideIcon } from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  award: Award,
  clipboard: ClipboardList,
  puzzle: Puzzle,
  package: Package,
  star: Star,
  phone: Phone,
  receipt: Receipt,
  map: MapPinned,
}

export function addonIcon(name: string) {
  return icons[name] || Puzzle
}
