import {
  ArrowRight, Banknote, Boxes, ChartNoAxesCombined, Check, ChevronLeft, ChevronRight, CircleEllipsis, Clock3,
  CreditCard, DatabaseBackup, Download, Eye, KeyRound, Landmark, LayoutDashboard, LockKeyhole, LogOut,
  Menu, Package, Pause, Pencil, Plus, Printer, ReceiptText, RefreshCw, RotateCcw,
  ScanBarcode, Search, Settings, Shapes, ShoppingCart, Smartphone, Trash2,
  TrendingUp, TriangleAlert, Users, WalletCards, Warehouse,
} from "lucide-react";

const icons = {
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  sales: ReceiptText,
  print: Printer,
  refund: RotateCcw,
  export: Download,
  products: Package,
  categories: Shapes,
  inventory: Warehouse,
  expenses: WalletCards,
  reports: ChartNoAxesCombined,
  users: Users,
  key: KeyRound,
  lock: LockKeyhole,
  backups: DatabaseBackup,
  settings: Settings,
  logout: LogOut,
  menu: Menu,
  arrow: ArrowRight,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  trend: TrendingUp,
  profit: TrendingUp,
  refresh: RefreshCw,
  alert: TriangleAlert,
  clock: Clock3,
  check: Check,
  plus: Plus,
  search: Search,
  edit: Pencil,
  trash: Trash2,
  eye: Eye,
  box: Boxes,
  barcode: ScanBarcode,
  cash: Banknote,
  card: CreditCard,
  bank: Landmark,
  wallet: Smartphone,
  other: CircleEllipsis,
  hold: Pause,
};

function Icon({ name, className = "size-5", strokeWidth = 1.8 }) {
  const Component = icons[name] || Package;
  return <Component className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

export default Icon;
