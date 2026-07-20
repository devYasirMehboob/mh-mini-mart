import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import useAuth from "../hooks/useAuth";
import usePermissions from "../hooks/usePermissions";
import useSettings from "../hooks/useSettings";
import NotificationBell from "../components/notifications/NotificationBell";

const groups = [
  {
    label: "Main", items: [
      { label: "Dashboard", path: "/dashboard", icon: "dashboard", description: "Shop overview" },
      { label: "Point of Sale", path: "/pos", icon: "pos", description: "Billing workspace", badge: "POS", permission: "pos.access" },
      { label: "Sales", path: "/sales", icon: "sales", description: "Orders and receipts", permission: "sales.view" },
    ]
  },
  {
    label: "Manage store", items: [
      { label: "Products", path: "/products", icon: "products", description: "Product catalogue", permission: "products.view" },
      { label: "Categories", path: "/categories", icon: "categories", description: "Product groups", permission: "categories.manage" },
      { label: "Inventory", path: "/inventory", icon: "inventory", description: "Stock and movements", permission: "inventory.view" },
      { label: "Batches", path: "/batches", icon: "cube", description: "Expiry tracking", permission: "inventory.view" },
      { label: "Suppliers", path: "/suppliers", icon: "users", description: "Vendors and balances", permission: "suppliers.view" },
      { label: "Purchases", path: "/purchases", icon: "box", description: "Bills and payments", permission: "purchases.view" },
      { label: "Purchase Returns", path: "/purchase-returns", icon: "refund", description: "Supplier returns", permission: "purchases.view" },
      { label: "Expenses", path: "/expenses", icon: "expenses", description: "Shop spending", permission: "expenses.view" },
    ]
  },
  {
    label: "Insights & system", items: [
      { label: "Reports", path: "/reports", icon: "reports", description: "Business insights", permission: "reports.view" },
      { label: "Users", path: "/users", icon: "users", description: "Staff access", permission: "users.manage" },
      { label: "Backups", path: "/backups", icon: "backups", description: "Protect your data", permission: "backups.create" },
      { label: "Notifications", path: "/notifications", icon: "bell", description: "System alerts", permission: "notifications.view" },
      { label: "Settings", path: "/settings", icon: "settings", description: "Shop preferences", permission: "settings.manage" },
    ]
  },
];
const navigation = groups.flatMap((group) => group.items);

function AppLayout() {
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const { settings } = useSettings();
  const shop = settings?.shop || {};
  const visibleGroups = groups.map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || can(item.permission)) })).filter((group) => group.items.length);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const current = navigation.find((item) => location.pathname.startsWith(item.path)) || { label: "MH Mini Mart", description: "Store management" };

  async function handleLogout() { await logout(); navigate("/login", { replace: true }); }

  return <div className="min-h-screen bg-app text-ink">
    {sidebarOpen && <button className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] lg:hidden" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/80 bg-white p-4 transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? "w-[280px] lg:w-[88px]" : "w-[280px]"}`}>
      
      {/* Modern floating toggle button */}
      <button
        type="button"
        className="hidden lg:flex absolute -right-3.5 top-9 z-50 h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-transform duration-300 hover:bg-slate-50 hover:text-slate-700 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label="Toggle sidebar"
      >
        <Icon name="chevron-left" className={`size-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} />
      </button>

      <div className={`flex h-14 items-center transition-all duration-300 ${isCollapsed ? "lg:w-12 lg:justify-center lg:px-0 lg:mx-auto" : "w-full px-2"}`}>
        <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-950 text-sm font-extrabold text-white shadow-lg shadow-slate-200">{shop.logo_url ? <img src={shop.logo_url} alt="" className="size-full bg-white object-contain p-1" /> : (shop.shop_name || "MH").slice(0,2).toUpperCase()}</span>
        <div className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? "lg:max-w-0 lg:opacity-0 lg:ml-0" : "max-w-[150px] opacity-100 ml-3"}`}>
          <strong className="block text-[15px] font-extrabold tracking-[-0.02em] text-slate-950">{shop.shop_name || "MH Mini Mart"}</strong>
          <span className="mt-0.5 block text-[11px] font-medium text-slate-400">Store management</span>
        </div>
      </div>

      <div className="my-4 h-px shrink-0 bg-slate-100" />
      
      <nav className="no-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden pr-1" aria-label="Main navigation">
        {visibleGroups.map((group) => (
          <section key={group.label}>
            <p className={`px-3 mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? "lg:max-h-0 lg:opacity-0 lg:mb-0" : "max-h-[20px] opacity-100"}`}>
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `group flex min-h-12 items-center rounded-xl transition-all duration-300 overflow-hidden ${isActive ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"} ${isCollapsed ? "lg:w-12 lg:px-0 lg:justify-center lg:mx-auto" : "w-full px-3"}`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400 transition-colors group-hover:bg-white group-hover:text-blue-600 group-[.active]:bg-transparent group-[.active]:text-white group-[.active]:shadow-none">
                    <Icon name={item.icon} className="size-[18px]" />
                  </span>
                  <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden flex-1 ${isCollapsed ? "lg:max-w-0 lg:opacity-0 lg:ml-0" : "max-w-[150px] opacity-100 ml-3"}`}>
                    <strong className="block truncate text-[13px] font-bold">{item.label}</strong>
                  </span>
                  {item.badge && (
                    <span className={`rounded-md py-0.5 text-[9px] font-extrabold transition-all duration-300 overflow-hidden whitespace-nowrap bg-white/20 text-current ${isCollapsed ? "lg:max-w-0 lg:opacity-0 lg:px-0 lg:ml-0" : "max-w-[40px] px-1.5 opacity-100 ml-3"}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className={`mt-4 rounded-2xl border transition-all duration-300 overflow-hidden shrink-0 ${isCollapsed ? "lg:bg-transparent lg:border-transparent lg:p-0 lg:w-12 lg:mx-auto" : "border-slate-200 bg-slate-50 p-3 w-full"}`}>
        <div className={`flex items-center transition-all duration-300 ${isCollapsed ? "lg:justify-center" : ""}`}>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-xs font-extrabold text-blue-700 shadow-sm ring-1 ring-slate-200" title={isCollapsed ? user.name : undefined}>
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className={`transition-all duration-300 whitespace-nowrap overflow-hidden flex-1 ${isCollapsed ? "lg:max-w-0 lg:opacity-0 lg:ml-0" : "max-w-[150px] opacity-100 ml-3"}`}>
            <strong className="block truncate text-xs font-extrabold text-slate-800">{user.name}</strong>
            <span className="mt-0.5 block truncate text-[10px] capitalize text-slate-400">{user.role} account</span>
          </div>
          <button className={`grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white hover:text-red-600 hover:shadow-sm overflow-hidden duration-300 ${isCollapsed ? "lg:max-w-0 lg:opacity-0 lg:ml-0 lg:p-0" : "max-w-[36px] opacity-100 ml-2"}`} type="button" aria-label="Logout" title="Logout" onClick={handleLogout}>
            <Icon name="logout" className="size-[17px]" />
          </button>
        </div>
      </div>

    </aside>
    <div className={`min-h-screen transition-all duration-300 ${isCollapsed ? "lg:ml-[88px]" : "lg:ml-[280px]"}`}>
      <header className="sticky top-0 z-20 flex h-[74px] items-center gap-4 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-7 lg:px-8">
        <button className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
          <Icon name="menu" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-extrabold text-slate-950">{current.label}</h1>
          <p className="mt-0.5 hidden text-[11px] font-medium text-slate-400 sm:block">{current.description}</p>
        </div>
        <div className="flex items-center gap-3">
          {can("notifications.view") && <NotificationBell />}
          <div className="hidden text-right sm:block">
            <p className="text-xs font-extrabold text-slate-800">{user.name}</p>
            <p className="mt-0.5 text-[10px] capitalize text-slate-400">{user.role} access</p>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-blue-600 text-xs font-extrabold text-white ring-4 ring-blue-50">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  </div>;
}

export default AppLayout;
