import { Award, ClipboardList, Package, Phone, Puzzle, Receipt, Sparkles, Star, type LucideIcon } from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  award: Award,
  clipboard: ClipboardList,
  puzzle: Puzzle,
  package: Package,
  star: Star,
  phone: Phone,
  receipt: Receipt,
}

export function addonIcon(name: string) {
  return icons[name] || Puzzle
}
