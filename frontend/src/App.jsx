import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import PagePlaceholder from './components/common/PagePlaceholder.jsx';
import NotFound from './components/common/NotFound.jsx';
import HomePage from './features/home/HomePage.jsx';
import FeaturesPage from './features/home/FeaturesPage.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import RegisterPage from './features/auth/RegisterPage.jsx';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage.jsx';
import Overview from './features/dashboard/Overview.jsx';
import FarmerShell, { FarmerAwareLayout } from './features/farmer/FarmerShell.jsx';
import CustomerShell, { RoleAwareLayout } from './features/customer/CustomerShell.jsx';
import CustomerDashboard from './features/customer/CustomerDashboard.jsx';
import FarmsPage from './features/farms/FarmsPage.jsx';
import CropsPage from './features/crops/CropsPage.jsx';
import CalculatorsPage from './features/calculators/CalculatorsPage.jsx';
import SeedCalculatorPage from './features/calculators/SeedCalculatorPage.jsx';
import LandCalculatorPage from './features/calculators/LandCalculatorPage.jsx';
import FertilizerCalculatorPage from './features/calculators/FertilizerCalculatorPage.jsx';
import DiseasePage from './features/disease/DiseasePage.jsx';
import WeatherPage from './features/weather/WeatherPage.jsx';
import MarketplacePage from './features/market/MarketplacePage.jsx';
import ProductPage from './features/market/ProductPage.jsx';
import CartPage from './features/market/CartPage.jsx';
import CheckoutPage from './features/market/CheckoutPage.jsx';
import MyOrdersPage from './features/market/MyOrdersPage.jsx';
import MySalesPage from './features/market/MySalesPage.jsx';
import MyProductsPage from './features/market/MyProductsPage.jsx';
import SellProducePage from './features/market/SellProducePage.jsx';
import RecommendPage from './features/recommend/RecommendPage.jsx';
import AdminShell from './features/admin/AdminShell.jsx';
import AdminOverview from './features/admin/AdminOverview.jsx';
import AdminUsers from './features/admin/AdminUsers.jsx';
import AdminSellers from './features/admin/AdminSellers.jsx';
import AdminProducts from './features/admin/AdminProducts.jsx';
import AdminOrders from './features/admin/AdminOrders.jsx';
import AdminRentals from './features/admin/AdminRentals.jsx';
import AdminNotBuilt from './features/admin/AdminNotBuilt.jsx';
import AdminLoginPage from './features/auth/AdminLoginPage.jsx';
import RentalsPage from './features/rentals/RentalsPage.jsx';
import MyBookingsPage from './features/rentals/MyBookingsPage.jsx';
import SellerShell from './features/seller/SellerShell.jsx';
import SellerDashboard from './features/seller/SellerDashboard.jsx';
import SellerProfile from './features/seller/SellerProfile.jsx';
import ProductForm from './features/seller/ProductForm.jsx';
import SellerProducts from './features/seller/SellerProducts.jsx';
import SellerOrders from './features/seller/SellerOrders.jsx';
import SellerRentals from './features/seller/SellerRentals.jsx';
import FarmerPayout from './features/farmer/FarmerPayout.jsx';
import SellerEarnings from './features/seller/SellerEarnings.jsx';
import SellerAnalytics from './features/seller/SellerAnalytics.jsx';
import SellerReviews from './features/seller/SellerReviews.jsx';
import SellerSettings from './features/seller/SellerSettings.jsx';
import FarmerEarnings from './features/farmer/FarmerEarnings.jsx';
import NotificationsList from './features/account/NotificationsList.jsx';
import NotificationsPage from './features/account/NotificationsPage.jsx';
import ProfilePage from './features/account/ProfilePage.jsx';
import MyCalculationsPage from './features/account/MyCalculationsPage.jsx';
import MandiPage from './features/account/MandiPage.jsx';
import ColdStoragePage from './features/account/ColdStoragePage.jsx';
import TasksPage from './features/tasks/TasksPage.jsx';
import IrrigationPage from './features/irrigation/IrrigationPage.jsx';
import ExpensesPage from './features/ledger/ExpensesPage.jsx';
import ProfitLossPage from './features/ledger/ProfitLossPage.jsx';

const soon = (title) => <PagePlaceholder title={title} description="This module is planned but not built yet." />;

// Old separate-dashboard URLs now map onto the single-site routes so saved links keep working.
const LEGACY = {
  '/farmer': '/my-overview', '/farmer/dashboard': '/my-overview', '/dashboard': '/my-overview',
  '/farmer/my-farm': '/my-farm', '/dashboard/farms': '/my-farm', '/farmer/crops': '/my-crops',
  '/farmer/seed-calculator': '/calculators/seed-calculator', '/farmer/calculators': '/calculators',
  '/farmer/recommend': '/recommend', '/farmer/disease': '/disease', '/farmer/weather': '/weather', '/farmer/ai-assistant': '/ai-assistant',
  '/admin/dashboard': '/admin',
  '/equipment-rental': '/rentals',
};
function LegacyRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={`${LEGACY[pathname.replace(/\/$/, '')] || '/'}${search}`} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* One site, one layout: navbar and footer are identical before and after login. */}
      <Route element={<PublicLayout />}>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        {/* The old crop guide is now part of crop recommendation. */}
        <Route path="/crops" element={<Navigate to="/recommend" replace />} />
        <Route path="/crops/:id" element={<Navigate to="/recommend" replace />} />
        <Route path="/mandi" element={<MandiPage />} />
        <Route path="/cold-storage" element={<ColdStoragePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/marketplace/:id" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/rentals" element={<RentalsPage />} />
        <Route path="/recommend" element={<RecommendPage />} />
        <Route path="/ai-assistant" element={soon('AI farming assistant')} />
        {/* Open to everyone; a signed-in farmer sees them inside the farmer sidebar. */}
        <Route element={<FarmerAwareLayout />}>
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/irrigation" element={<IrrigationPage />} />
          <Route path="/calculators" element={<CalculatorsPage />} />
          <Route path="/calculators/seed-calculator" element={<SeedCalculatorPage />} />
          <Route path="/calculators/land-calculator" element={<LandCalculatorPage />} />
          <Route path="/calculators/fertilizer-calculator" element={<FertilizerCalculatorPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        {/* Private admin entry. Not linked anywhere on the public site; the server accepts only admin accounts here. */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/about" element={<PagePlaceholder title="About KrishiMitra AI" description="Write your story here before launch." />} />
        <Route path="/privacy" element={<PagePlaceholder title="Privacy policy" description="Add your privacy policy before launch." />} />
        <Route path="/terms" element={<PagePlaceholder title="Terms of use" description="Add your terms before launch." />} />

        {/* Signed-in pages (any role) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          {/* Farmers get the farmer sidebar and customers the customer sidebar on these shared pages. */}
          <Route element={<RoleAwareLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/my-orders" element={<MyOrdersPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
          </Route>
        </Route>

        {/* Sellers: farmers and vendors */}
        <Route element={<ProtectedRoute allowedRoles={['farmer', 'vendor']} />}>
          <Route element={<FarmerAwareLayout />}>
            <Route path="/my-products" element={<MyProductsPage />} />
            <Route path="/my-sales" element={<MySalesPage />} />
          </Route>
        </Route>

        {/* Seller dashboard (vendor role). The backend /api/seller/* routes enforce this independently. */}
        <Route element={<ProtectedRoute allowedRoles={['vendor']} />}>
          <Route path="/seller" element={<SellerShell />}>
            <Route index element={<SellerDashboard />} />
            <Route path="profile" element={<SellerProfile />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="rentals" element={<SellerRentals />} />
            <Route path="earnings" element={<SellerEarnings />} />
            <Route path="analytics" element={<SellerAnalytics />} />
            <Route path="reviews" element={<SellerReviews />} />
            <Route path="notifications" element={<NotificationsList />} />
            <Route path="settings" element={<SellerSettings />} />
          </Route>
        </Route>

        {/* Customer dashboard (customer role). The backend /api/customer/* routes enforce this independently. */}
        <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
          <Route element={<CustomerShell />}>
            <Route path="/customer" element={<CustomerDashboard />} />
          </Route>
        </Route>

        {/* Farmer features (farmer role) */}
        <Route element={<ProtectedRoute allowedRoles={['farmer']} />}>
          {/* Every farmer page shares the shell, so the sidebar never disappears. */}
          <Route element={<FarmerShell />}>
            <Route path="/my-overview" element={<Overview />} />
            <Route path="/my-farm" element={<FarmsPage />} />
            <Route path="/my-crops" element={<CropsPage />} />
            <Route path="/sell-produce" element={<SellProducePage />} />
            <Route path="/my-calculations" element={<MyCalculationsPage />} />
            <Route path="/my-expenses" element={<ExpensesPage />} />
            <Route path="/my-tasks" element={<TasksPage />} />
            <Route path="/my-profit-loss" element={<ProfitLossPage />} />
            <Route path="/disease" element={<DiseasePage />} />
            {/* Same pages sellers use, reading the farmer's own data (/api/farmer/*) or the shared account endpoints. */}
            <Route path="/my-analytics" element={<SellerAnalytics base="/farmer" />} />
            <Route path="/my-earnings" element={<FarmerEarnings />} />
            <Route path="/my-payout" element={<FarmerPayout />} />
            <Route path="/my-equipment" element={<SellerRentals />} />
            <Route path="/my-settings" element={<SellerSettings />} />
          </Route>
        </Route>

        {/* Admin Panel (admin role). The backend /api/admin/* routes enforce this independently. */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="sellers" element={<AdminSellers />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="rentals" element={<AdminRentals />} />
            <Route path="settings" element={<AdminNotBuilt />} />
          </Route>
        </Route>

        {/* Old URLs */}
        {Object.keys(LEGACY).map((from) => <Route key={from} path={from} element={<LegacyRedirect />} />)}
        <Route path="/farmer/*" element={<LegacyRedirect />} />
        <Route path="/dashboard/*" element={<LegacyRedirect />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
