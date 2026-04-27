import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8070/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("unilife_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// auth
export const loginApi = (payload) => api.post("/auth/login", payload);
export const registerApi = (payload) => api.post("/auth/register", payload);
export const getMeApi = () => api.get("/auth/me");
export const updateProfileApi = (payload) => api.patch("/auth/me", payload);

// student
export const getMyBookingsApi = () => api.get("/accommodation/bookings/me");
export const getMyPaymentHistoryApi = () => api.get("/payments/me");
export const getMyCurrentHousingGroupApi = () =>
  api.get("/accommodation/housing-group/me/current");
export const getMyTicketsApi = () => api.get("/accommodation/tickets/me");
export const createTicketApi = (payload) =>
  api.post("/accommodation/tickets", payload);

// landlord
export const getLandlordBookingsApi = () =>
  api.get("/accommodation/bookings/landlord");
export const getLandlordPaymentHistoryApi = () =>
  api.get("/payments/landlord/history");
export const getLandlordTicketsApi = () =>
  api.get("/accommodation/tickets/landlord");
export const updateTicketStatusApi = (ticketId, payload) =>
  api.patch(`/accommodation/tickets/${ticketId}/status`, payload);
export const updateTicketPriorityApi = (ticketId, payload) =>
  api.patch(`/accommodation/tickets/${ticketId}/priority`, payload);

// chat
export const getInboxApi = (params = {}) => api.get("/chat/inbox", { params });
export const getThreadApi = (listingId, studentId) =>
  api.get(`/chat/threads/${listingId}`, {
    params: studentId ? { studentId } : {},
  });
export const sendMessageApi = (payload) => api.post("/chat/messages", payload);
export const archiveChatApi = (conversationKey) =>
  api.patch(`/chat/conversations/${encodeURIComponent(conversationKey)}/archive`);
export const deleteChatApi = (conversationKey) =>
  api.patch(`/chat/conversations/${encodeURIComponent(conversationKey)}/delete`);
export const markChatReadApi = (conversationKey) =>
  api.patch(`/chat/conversations/${encodeURIComponent(conversationKey)}/read`);
export const markChatUnreadApi = (conversationKey) =>
  api.patch(`/chat/conversations/${encodeURIComponent(conversationKey)}/unread`);

// notifications
export const getNotificationsApi = () => api.get("/notifications/me");
export const markNotificationReadApi = (id) =>
  api.patch(`/notifications/${id}/read`);
export const markAllNotificationsReadApi = () =>
  api.patch("/notifications/read-all");

export default api;

// listings
export const getListingsApi = (params = {}) =>
  api.get("/accommodation/listings", { params });

export const getListingByIdApi = (listingId) =>
  api.get(`/accommodation/listings/${listingId}`);

// bookings
export const createBookingRequestApi = (payload) =>
  api.post("/accommodation/bookings", payload);

export const getBookingByIdApi = (bookingId) =>
  api.get(`/accommodation/bookings/${bookingId}`);

export const payBookingAmountApi = (bookingId) =>
  api.post(`/payments/booking/${bookingId}`);

export const payMonthlyRentApi = (housingGroupId) =>
  api.post(`/payments/rent/${housingGroupId}`);

export const getRentStatusApi = () =>
  api.get("/payments/me/rent-status");

export const approveBookingApi = (bookingId) =>
  api.patch(`/accommodation/bookings/${bookingId}/approve`);

export const rejectBookingApi = (bookingId, payload) =>
  api.patch(`/accommodation/bookings/${bookingId}/reject`, payload);

export const createListingApi = (payload) =>
  api.post("/accommodation/listings", payload);

export const getMyListingsApi = () =>
  api.get("/accommodation/listings", {
    params: { mine: "true" },
  });

export const updateListingApi = (listingId, payload) =>
  api.patch(`/accommodation/listings/${listingId}`, payload);

export const toggleListingStatusApi = (listingId) =>
  api.patch(`/accommodation/listings/${listingId}/toggle-status`);

export const deleteListingApi = (listingId) =>
  api.delete(`/accommodation/listings/${listingId}`);

// admin
export const getPendingLandlordsApi = () =>
  api.get("/accommodation/admin/landlords/pending");

export const verifyLandlordApi = (landlordId) =>
  api.patch(`/accommodation/admin/landlords/${landlordId}/verify`);

export const rejectLandlordVerificationApi = (landlordId) =>
  api.patch(`/accommodation/admin/landlords/${landlordId}/reject`);

export const getPendingListingsApi = () =>
  api.get("/accommodation/listings", {
    params: { status: "PENDING_APPROVAL" },
  });

export const approveListingApi = (listingId) =>
  api.patch(`/accommodation/listings/${listingId}/approve`);

export const rejectListingApi = (listingId, payload = {}) =>
  api.patch(`/accommodation/listings/${listingId}/reject`, payload);

// admin: user management
export const getAllUsersApi = (params = {}) =>
  api.get("/admin/users", { params });

export const getUserByIdApi = (id) =>
  api.get(`/admin/users/${id}`);

export const updateUserApi = (id, data) =>
  api.patch(`/admin/users/${id}`, data);

export const deleteUserApi = (id) =>
  api.delete(`/admin/users/${id}`);

export const suspendUserApi = (id, data) =>
  api.patch(`/admin/users/${id}/suspend`, data);

export const reactivateUserApi = (id) =>
  api.patch(`/admin/users/${id}/reactivate`);

// student food
export const getStudentFoodItemsApi = (params = {}) =>
  api.get("/food/student/items", { params });

export const getStudentFoodItemByIdApi = (id) =>
  api.get(`/food/student/items/${id}`);

export const getStudentFoodCartApi = () =>
  api.get("/food/student/cart");

export const addStudentFoodCartItemApi = (payload) =>
  api.post("/food/student/cart", payload);

export const updateStudentFoodCartItemApi = (cartItemId, payload) =>
  api.patch(`/food/student/cart/${cartItemId}`, payload);

export const removeStudentFoodCartItemApi = (cartItemId) =>
  api.delete(`/food/student/cart/${cartItemId}`);

export const checkoutStudentFoodApi = (payload) =>
  api.post("/food/student/checkout", payload);

export const getStudentFoodOrdersApi = () =>
  api.get("/food/student/orders");

export const generateStudentMealPlanApi = (payload) =>
  api.post("/food/student/meal-planner/generate", payload);

export const getStudentCurrentMealPlanApi = () =>
  api.get("/food/student/meal-planner/current");

export const initStudentMealPlanApi = (payload) =>
  api.post("/food/student/meal-planner/init", payload);

export const getMealPlanPrefsApi = () =>
  api.get("/food/student/meal-planner/prefs");

export const setMealSlotApi = (payload) =>
  api.patch("/food/student/meal-planner/slot", payload);

export const clearMealSlotApi = (payload) =>
  api.delete("/food/student/meal-planner/slot", { data: payload });

export const getStudentFoodBudgetSummaryApi = () =>
  api.get("/food/student/budget-summary");

export const getStudentEatNowRecommendationsApi = () =>
  api.get("/food/student/recommendations/eat-now");

// admin food
export const getPendingVendorsApi = () =>
  api.get("/food/admin/vendors/pending");

export const verifyVendorApi = (vendorId) =>
  api.patch(`/food/admin/vendors/${vendorId}/verify`);

export const rejectVendorApi = (vendorId) =>
  api.patch(`/food/admin/vendors/${vendorId}/reject`);

export const getAllFoodOrdersAdminApi = () =>
  api.get("/food/admin/orders");

export const dispatchFoodOrderApi = (orderId) =>
  api.patch(`/food/admin/orders/${orderId}/dispatch`);

export const markFoodOrderDeliveredApi = (orderId) =>
  api.patch(`/food/admin/orders/${orderId}/deliver`);

// vendor food
export const getVendorFoodItemsApi = () =>
  api.get("/food/vendor/items");

export const createVendorFoodItemApi = (payload) =>
  api.post("/food/vendor/items", payload);

export const updateVendorFoodItemApi = (itemId, payload) =>
  api.patch(`/food/vendor/items/${itemId}`, payload);

export const deleteVendorFoodItemApi = (itemId) =>
  api.delete(`/food/vendor/items/${itemId}`);

export const getVendorFoodOrdersApi = () =>
  api.get("/food/vendor/orders");

export const updateVendorFoodOrderStatusApi = (orderId, payload) =>
  api.patch(`/food/vendor/orders/${orderId}/status`, payload);

export const getVendorDashboardStatsApi = () =>
  api.get("/food/vendor/dashboard/stats");

export const getVendorFoodStatsApi = () =>
  api.get("/food/vendor/stats");

export const getVendorSalesDataApi = (params = {}) =>
  api.get("/food/vendor/sales", { params });

// transport manager
export const createTransportListingApi = (payload) =>
  api.post("/transport/manager/listings", payload);

export const getMyTransportListingsApi = () =>
  api.get("/transport/manager/listings");

export const getTransportListingByIdApi = (id) =>
  api.get(`/transport/manager/listings/${id}`);

export const updateTransportListingApi = (id, payload) =>
  api.patch(`/transport/manager/listings/${id}`, payload);

export const deleteTransportListingApi = (id) =>
  api.delete(`/transport/manager/listings/${id}`);

export const calculateTransportPriceApi = (payload) =>
  api.post("/transport/manager/calculate-price", payload);

export const getManagerBookingsApi = () =>
  api.get("/transport/manager/bookings");

// admin transport
export const getPendingTransportManagersApi = () =>
  api.get("/transport/admin/managers/pending");

export const verifyTransportManagerApi = (id) =>
  api.patch(`/transport/admin/managers/${id}/verify`);

export const rejectTransportManagerApi = (id) =>
  api.patch(`/transport/admin/managers/${id}/reject`);

export const getPendingTransportListingsApi = () =>
  api.get("/transport/admin/listings/pending");

export const approveTransportListingApi = (id) =>
  api.patch(`/transport/admin/listings/${id}/approve`);

export const rejectTransportListingApi = (id, payload = {}) =>
  api.patch(`/transport/admin/listings/${id}/reject`, payload);

// housing group: move-in checklist (landlord/student/admin)
export const updateMoveInChecklistApi = (housingGroupId, payload) =>
  api.patch(`/accommodation/housing-group/${housingGroupId}/checklist`, payload);

// housing group by booking ID
export const getHousingGroupByBookingApi = (bookingId) =>
  api.get(`/accommodation/housing-group/${bookingId}`);

// housing group: roommate preferences (student)
export const updateRoommatePreferencesApi = (housingGroupId, payload) =>
  api.patch(`/accommodation/housing-group/${housingGroupId}/preferences`, payload);

// listing roommates (for listing details page)
export const getListingRoommatesApi = (listingId) =>
  api.get(`/accommodation/listings/${listingId}/roommates`);

// landlord housing groups (for checklist management)
export const getLandlordHousingGroupsApi = () =>
  api.get("/accommodation/housing-groups/landlord");

// student transport
export const browseTransportListingsApi = () =>
  api.get("/transport/student/listings");

export const getTransportListingPublicApi = (id) =>
  api.get(`/transport/student/listings/${id}`);

export const searchTransportTripsApi = (params = {}) =>
  api.get("/transport/student/search", { params });

export const bookTransportTripApi = (payload) =>
  api.post("/transport/student/book", payload);

export const getMyTransportBookingsApi = () =>
  api.get("/transport/student/bookings");

export const getTransportBookingApi = (id) =>
  api.get(`/transport/student/bookings/${id}`);

export const payTransportBookingApi = (id) =>
  api.post(`/transport/student/bookings/${id}/pay`);

export const clearTransportHistoryApi = () =>
  api.delete("/transport/student/bookings/history");

export const getFavoriteLocationsApi = () =>
  api.get("/transport/student/favorites");

export const addFavoriteLocationApi = (payload) =>
  api.post("/transport/student/favorites", payload);

export const removeFavoriteLocationApi = (id) =>
  api.delete(`/transport/student/favorites/${id}`);

export const initTripPlanApi = (payload) =>
  api.post("/transport/student/trip-planner/init", payload);

export const getCurrentTripPlanApi = () =>
  api.get("/transport/student/trip-planner/current");

export const getTripPricingApi = () =>
  api.get("/transport/student/trip-planner/pricing");

export const setTripSlotApi = (payload) =>
  api.patch("/transport/student/trip-planner/slot", payload);

export const clearTripSlotApi = (payload) =>
  api.delete("/transport/student/trip-planner/slot", { data: payload });

// reviews
export const createReviewApi = (payload) =>
  api.post("/reviews", payload);

export const checkReviewExistsApi = (entityId) =>
  api.get(`/reviews/check/${entityId}`);

export const getMyReviewsApi = () =>
  api.get("/reviews/my");

export const getReceivedReviewsApi = () =>
  api.get("/reviews/received");

export const getUserRatingApi = (userId) =>
  api.get(`/reviews/rating/${userId}`);

export const adminGetAllReviewsApi = () =>
  api.get("/reviews/admin/all");