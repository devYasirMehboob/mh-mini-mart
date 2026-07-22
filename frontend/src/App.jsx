import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import CategoriesPage from "./pages/CategoriesPage";
import UnitsPage from "./pages/UnitsPage";
import BackupsPage from "./pages/BackupsPage";
import DashboardPage from "./pages/DashboardPage";
import ExpensesPage from "./pages/ExpensesPage";
import InventoryPage from "./pages/InventoryPage";
import BatchesPage from "./pages/BatchesPage";
import LoginPage from "./pages/LoginPage";
import PosPage from "./pages/PosPage";
import ProductsPage from "./pages/ProductsPage";
import ReportsPage from "./pages/ReportsPage";
import PackagingStockPage from "./pages/PackagingStockPage";
import SalesPage from "./pages/SalesPage";
import BarcodeLabelsPage from "./pages/BarcodeLabelsPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import SuppliersPage from "./pages/SuppliersPage";
import PurchasesPage from "./pages/PurchasesPage";
import PurchaseFormPage from "./pages/PurchaseFormPage";
import PurchaseDetailsPage from "./pages/PurchaseDetailsPage";
import PurchaseReturnsPage from "./pages/PurchaseReturnsPage";
import PermissionRoute from "./routes/PermissionRoute";
import ProtectedRoute from "./routes/ProtectedRoute";

const permitted = (permission, component) => (
  <PermissionRoute permission={permission}>{component}</PermissionRoute>
);

import NotificationsPage from "./pages/NotificationsPage";
import AlertProvider from "./components/feedback/AlertProvider";
import { OfflineProvider } from "./context/OfflineContext";
import OfflineBanner from "./components/common/OfflineBanner";

function App() {
  return (
    <OfflineProvider>
      <AlertProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/pos" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route
                path="pos"
                element={permitted("pos.access", <PosPage />)}
              />
              <Route
                path="sales"
                element={permitted("sales.view", <SalesPage />)}
              />
              <Route
                path="categories"
                element={permitted("categories.manage", <CategoriesPage />)}
              />
              <Route
                path="units"
                element={permitted("categories.manage", <UnitsPage />)}
              />
              <Route
                path="products"
                element={permitted("products.view", <ProductsPage />)}
              />
              <Route
                path="products/labels"
                element={permitted("labels.print", <BarcodeLabelsPage />)}
              />
              <Route
                path="inventory"
                element={permitted("inventory.view", <InventoryPage />)}
              />
              <Route
                path="batches"
                element={permitted("inventory.view", <BatchesPage />)}
              />
              <Route
                path="suppliers"
                element={permitted("suppliers.view", <SuppliersPage />)}
              />
              <Route
                path="purchases"
                element={permitted("purchases.view", <PurchasesPage />)}
              />
              <Route
                path="purchases/new"
                element={permitted("purchases.create", <PurchaseFormPage />)}
              />
              <Route
                path="purchases/:id/edit"
                element={permitted("purchases.update", <PurchaseFormPage />)}
              />
              <Route
                path="purchases/:id"
                element={permitted("purchases.view", <PurchaseDetailsPage />)}
              />
              <Route
                path="purchase-returns"
                element={permitted("purchases.view", <PurchaseReturnsPage />)}
              />
              <Route
                path="expenses"
                element={permitted("expenses.view", <ExpensesPage />)}
              />
              <Route
                path="reports"
                element={permitted("reports.view", <ReportsPage />)}
              />
              <Route
                path="reports/packaging-stock"
                element={permitted("reports.view", <PackagingStockPage />)}
              />
              <Route
                path="users"
                element={permitted("users.manage", <UsersPage />)}
              />
              <Route
                path="backups"
                element={permitted("backups.create", <BackupsPage />)}
              />
              <Route
                path="settings"
                element={permitted("settings.manage", <SettingsPage />)}
              />
              <Route
                path="notifications"
                element={permitted("notifications.view", <NotificationsPage />)}
              />
              <Route path="access-denied" element={<AccessDeniedPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </AlertProvider>
    </OfflineProvider>
  );
}
export default App;
