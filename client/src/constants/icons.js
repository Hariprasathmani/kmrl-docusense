// constants/icons.js — Lucide icon exports and mappings
// Central point for all icon usage across the application

export {
  // Navigation & UI
  LayoutDashboard,
  Files,
  Ticket,
  Upload,
  Users,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  MoreHorizontal,
  
  // Status indicators
  Clock,
  Hourglass,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Share2,
  
  // Departments & Features
  Building2,
  UsersRound,
  ShieldCheck,
  Scale,
  Workflow,
  Monitor,
  
  // Analytics & Data
  ChartNoAxesCombined,
  TrendingUp,
  BarChart3,
  PieChart,
  
  // Document & File
  FileText,
  Download,
  Eye,
  Trash2,
  Edit,
  Copy,
  
  // User & Profile
  UserRound,
  UserCheck,
  Lock,
  Mail,
  
  // Actions
  Plus,
  Filter,
  RefreshCw,
  Save,
  Send,
  Archive,
  
  // Status variants
  Check,
  AlertTriangle,
  Info,
  HelpCircle,
  
  // Notifications
  Bell,
  
  // Map department names to Lucide icons
  // Used in DepartmentBadge and department selectors
  DepartmentIcons,
  
  // Status icon mapping
  StatusIcons,
  PriorityIcons,
} from 'lucide-react';

import {
  Building2,
  UsersRound,
  ShieldCheck,
  Scale,
  Workflow,
  Monitor,
  Clock,
  CheckCircle2,
  XCircle,
  Share2,
} from 'lucide-react';

/**
 * Map department names to Lucide icons
 * Used in DepartmentBadge component
 */
export const DepartmentIcons = {
  Finance: Building2,
  HR: UsersRound,
  Safety: ShieldCheck,
  Legal: Scale,
  Operations: Workflow,
  IT: Monitor,
};

/**
 * Map status values to Lucide icons
 * Used in StatusBadge component
 */
export const StatusIcons = {
  pending: Clock,
  'In Progress': Hourglass,
  'in progress': Hourglass,
  shared: Share2,
  Resolved: CheckCircle2,
  resolved: CheckCircle2,
  Rejected: XCircle,
  rejected: XCircle,
  new: Clock,
  New: Clock,
  assigned: CheckCircle2,
  Assigned: CheckCircle2,
  returned: AlertCircle,
  Returned: AlertCircle,
  closed: XCircle,
  Closed: XCircle,
};

/**
 * Map priority levels to color/styling info
 * Used in PriorityBadge component
 */
export const PriorityIcons = {
  Critical: 'badge-priority-critical',
  critical: 'badge-priority-critical',
  High: 'badge-priority-high',
  high: 'badge-priority-high',
  Medium: 'badge-priority-medium',
  medium: 'badge-priority-medium',
  Low: 'badge-priority-low',
  low: 'badge-priority-low',
};

// Import remaining icons for direct export
export { Hourglass, AlertCircle } from 'lucide-react';
