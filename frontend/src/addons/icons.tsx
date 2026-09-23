import { Award, ClipboardList, Package, Phone, Puzzle, Sparkles, Star, type LucideIcon } from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  award: Award,
  clipboard: ClipboardList,
  puzzle: Puzzle,
  package: Package,
  star: Star,
  phone: Phone,
}

export function addonIcon(name: string) {
  return icons[name] || Puzzle
}
