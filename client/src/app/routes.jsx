import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import AppShell from "../components/AppShell";
import VendorVerificationGuard from "../components/VendorVerificationGuard";
import TransportManagerVerificationGuard from "../components/TransportManagerVerificationGuard";

import LoginPage from "../pages/auth/LoginPage.jsx";
import RegisterPage from "../pages/auth/RegisterPage.jsx";
import VendorDashboardPage from "../pages/vendor/VendorDashboardPage.jsx";
import VendorFoodItemsPage from "../pages/vendor/VendorFoodItemsPage.jsx";
import VendorOrdersPage from "../pages/vendor/VendorOrdersPage.jsx";
import VendorSalesPage from "../pages/vendor/VendorSalesPage.jsx";

import StudentBookingsDashboardPage from "../pages/studnet/BookingsDashboardPage.jsx";
import StudentBookingPaymentPage from "../pages/studnet/BookingPaymentPage.jsx";
import StudentPaymentsDashboardPage from "../pages/studnet/PaymentsDashboardPage.jsx";
import StudentTicketsDashboardPage from "../pages/studnet/TicketsDashboardPage.jsx";
import StudentPortalDashboardPage from "../pages/studnet/StudentPortalDashboardPage.jsx";
import AccommodationHubPage from "../pages/studnet/AccommodationHubPage.jsx";
import FoodHubPage from "../pages/studnet/FoodHubPage.jsx";
import BrowseFoodPage from "../pages/studnet/BrowseFoodPage.jsx";
import FoodCartPage from "../pages/studnet/FoodCartPage.jsx";
import FoodPaymentPage from "../pages/studnet/FoodPaymentPage.jsx";
import FoodOrdersPage from "../pages/studnet/FoodOrdersPage.jsx";
import FoodMealPlannerPage from "../pages/studnet/FoodMealPlannerPage.jsx";
import FoodBudgetPage from "../pages/studnet/FoodBudgetPage.jsx";
import StudentTransportHubPage from "../pages/studnet/StudentTransportHubPage.jsx";
import TransportSearchPage from "../pages/studnet/TransportSearchPage.jsx";
import TransportBookingsPage from "../pages/studnet/TransportBookingsPage.jsx";
import TransportTripPlannerPage from "../pages/studnet/TransportTripPlannerPage.jsx";
import TransportFavoritesPage from "../pages/studnet/TransportFavoritesPage.jsx";
import TransportListingDetailPage from "../pages/studnet/TransportListingDetailPage.jsx";
import TransportPaymentPage from "../pages/studnet/TransportPaymentPage.jsx";
import StudentProfilePage from "../pages/studnet/ProfilePlaceholderPage.jsx";

import LandlordBookingsDashboardPage from "../pages/landlord/BookingsDashboardPage.jsx";
import LandlordDashboardPage from "../pages/landlord/LandlordDashboardPage.jsx";
import LandlordPaymentsDashboardPage from "../pages/landlord/PaymentsDashboardPage.jsx";
import LandlordTicketsDashboardPage from "../pages/landlord/TicketsDashboardPage.jsx";

import AdminDashboardPage from "../pages/admin/AdminDashboardPage.jsx";
import PendingLandlordsPage from "../pages/admin/PendingLandlordsPage";
import PendingVendorsPage from "../pages/admin/PendingVendorsPage.jsx";
import PendingListingsPage from "../pages/admin/PendingListingsPage";
import UserManagementPage from "../pages/admin/UserManagementPage.jsx";
import PendingTransportManagersPage from "../pages/admin/PendingTransportManagersPage.jsx";
import PendingTransportListingsPage from "../pages/admin/PendingTransportListingsPage.jsx";
import AdminFoodDeliveryPage from "../pages/admin/AdminFoodDeliveryPage.jsx";

import TransportDashboardPage from "../pages/transport/TransportDashboardPage.jsx";
import CreateTransportListingPage from "../pages/transport/CreateTransportListingPage.jsx";
import ManagerTransportBookingsPage from "../pages/transport/TransportBookingsPage.jsx";

import ChatPage from "../pages/shared/ChatPage.jsx";
import NotificationsPage from "../pages/shared/NotificationsPage.jsx";
import ReceivedReviewsPage from "../pages/shared/ReceivedReviewsPage.jsx";

import AdminUserReviewsPage from "../pages/admin/AdminUserReviewsPage.jsx";

import StudentListingsPage from "../pages/studnet/ListingsPage";
import StudentListingDetailsPage from "../pages/studnet/ListingDetailsPage";

import LandlordListingsPage from "../pages/landlord/ListingsPage";
import CreateListingPage from "../pages/landlord/CreateListingPage";
import EditListingPage from "../pages/landlord/EditListingPage";

export default function AppRoutes() {
  const { user, routeByRole } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={routeByRole(user.role)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/student"
        element={
          <ProtectedRoute roles={["STUDENT"]}>
            <AppShell role="STUDENT" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentPortalDashboardPage />} />
        <Route path="accommodation" element={<AccommodationHubPage />} />
        <Route path="food" element={<FoodHubPage />} />
        <Route path="food/browse" element={<BrowseFoodPage />} />
        <Route path="food/cart" element={<FoodCartPage />} />
        <Route path="food/payment" element={<FoodPaymentPage />} />
        <Route path="food/orders" element={<FoodOrdersPage />} />
        <Route path="food/meal-planner" element={<FoodMealPlannerPage />} />
        <Route path="food/budget" element={<FoodBudgetPage />} />
        <Route path="transport" element={<StudentTransportHubPage />} />
        <Route path="transport/search" element={<TransportSearchPage />} />
        <Route path="transport/bookings" element={<TransportBookingsPage />} />
        <Route path="transport/trip-planner" element={<TransportTripPlannerPage />} />
        <Route path="transport/favorites" element={<TransportFavoritesPage />} />
        <Route path="transport/listing/:id" element={<TransportListingDetailPage />} />
        <Route path="transport/bookings/:id/pay" element={<TransportPaymentPage />} />
        <Route path="profile" element={<StudentProfilePage />} />

        <Route path="listings" element={<StudentListingsPage />} />
        <Route path="listings/:id" element={<StudentListingDetailsPage />} />
        <Route path="bookings" element={<StudentBookingsDashboardPage />} />
        <Route path="bookings/:id/pay" element={<StudentBookingPaymentPage />} />
        <Route path="payments" element={<StudentPaymentsDashboardPage />} />
        <Route path="tickets" element={<StudentTicketsDashboardPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route
        path="/landlord"
        element={
          <ProtectedRoute roles={["LANDLORD"]}>
            <AppShell role="LANDLORD" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<LandlordDashboardPage />} />
        <Route path="listings" element={<LandlordListingsPage />} />
        <Route path="listings/create" element={<CreateListingPage />} />
        <Route path="listings/:id/edit" element={<EditListingPage />} />
        <Route path="bookings" element={<LandlordBookingsDashboardPage />} />
        <Route path="payments" element={<LandlordPaymentsDashboardPage />} />
        <Route path="tickets" element={<LandlordTicketsDashboardPage />} />
        <Route path="reviews" element={<ReceivedReviewsPage roleLabel="Landlord" />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route
        path="/vendor"
        element={
          <ProtectedRoute roles={["VENDOR"]}>
            <VendorVerificationGuard>
              <AppShell role="VENDOR" />
            </VendorVerificationGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<VendorDashboardPage />} />
        <Route path="items" element={<VendorFoodItemsPage />} />
        <Route path="orders" element={<VendorOrdersPage />} />
        <Route path="sales" element={<VendorSalesPage />} />
        <Route path="reviews" element={<ReceivedReviewsPage roleLabel="Vendor" />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <AppShell role="ADMIN" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="landlords" element={<PendingLandlordsPage />} />
        <Route path="vendors" element={<PendingVendorsPage />} />
        <Route path="listings" element={<PendingListingsPage />} />
        <Route path="transport-managers" element={<PendingTransportManagersPage />} />
        <Route path="transport-listings" element={<PendingTransportListingsPage />} />
        <Route path="user-reviews" element={<AdminUserReviewsPage />} />
        <Route path="food/delivery" element={<AdminFoodDeliveryPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route
        path="/transport-manager"
        element={
          <ProtectedRoute roles={["TRANSPORT_MANAGER"]}>
            <TransportManagerVerificationGuard>
              <AppShell role="TRANSPORT_MANAGER" />
            </TransportManagerVerificationGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TransportDashboardPage />} />
        <Route path="create" element={<CreateTransportListingPage />} />
        <Route path="edit/:id" element={<CreateTransportListingPage />} />
        <Route path="bookings" element={<ManagerTransportBookingsPage />} />
        <Route path="reviews" element={<ReceivedReviewsPage roleLabel="Transport Manager" />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}