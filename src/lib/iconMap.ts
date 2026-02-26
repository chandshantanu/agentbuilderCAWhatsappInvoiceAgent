import {
  BarChart2,
  FileText,
  Users,
  Download,
  Home,
  Settings,
  MessageSquare,
  MessageCircle,
  Activity,
  Inbox,
  CreditCard,
  Bell,
  Layers,
  ShoppingBag,
  PieChart,
  TrendingUp,
  LayoutDashboard,
  Package,
  Globe,
  Mail,
  Phone,
  BookOpen,
  Library,
  Target,
  type LucideIcon,
} from 'lucide-react';

/**
 * Maps icon name strings from dashboard tab config to lucide-react components.
 * lucide-react doesn't support dynamic string→component lookup, so we keep a static map.
 */
const iconMap: Record<string, LucideIcon> = {
  'bar-chart-2': BarChart2,
  'bar-chart': BarChart2,
  'file-text': FileText,
  users: Users,
  download: Download,
  home: Home,
  settings: Settings,
  'message-square': MessageSquare,
  'message-circle': MessageCircle,
  conversations: MessageCircle,
  'book-open': BookOpen,
  'knowledge-base': BookOpen,
  library: Library,
  metrics: BarChart2,
  'bar-chart-3': BarChart2,
  activity: Activity,
  inbox: Inbox,
  'credit-card': CreditCard,
  bell: Bell,
  layers: Layers,
  'shopping-bag': ShoppingBag,
  'pie-chart': PieChart,
  'trending-up': TrendingUp,
  'layout-dashboard': LayoutDashboard,
  overview: LayoutDashboard,
  dashboard: LayoutDashboard,
  package: Package,
  globe: Globe,
  mail: Mail,
  phone: Phone,
  target: Target,
  campaigns: Target,
};

export function getIcon(name?: string): LucideIcon | null {
  if (!name) return null;
  return iconMap[name.toLowerCase()] || null;
}
