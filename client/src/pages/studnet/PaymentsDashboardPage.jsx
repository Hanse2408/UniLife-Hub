import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  CreditCard,
  House,
  MessageSquare,
  ReceiptText,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getMyCurrentHousingGroupApi, getMyPaymentHistoryApi, getRentStatusApi, payMonthlyRentApi, checkReviewExistsApi, createReviewApi } from "../../api/client";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/StatusBadge";
import ReviewModal from "../../components/common/ReviewModal";
import RoommatePreferencesModal from "../../components/accommodation/RoommatePreferencesModal";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import emptyPayments from "../../assets/illustrations/empty-payments.png";

function formatCurrency(amount) {
  return `LKR ${(amount || 0).toLocaleString()}`;
}

function formatDate(value, options) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-GB", options);
}

function formatPaymentType(type) {
  if (type === "KEY_MONEY") return "Key Money";
  if (type === "BOOKING") return "Booking";
  if (type === "RENT") return "Rent";
  return type || "Payment";
}

function getPaymentNote(payment) {
  if (payment.type === "KEY_MONEY") {
    return "This upfront payment activated your move-in workflow.";
  }

  if (payment.type === "RENT") {
    return payment.monthKey
      ? `Covers billing cycle ${payment.monthKey}.`
      : "Monthly rent payment record.";
  }

  if (payment.type === "BOOKING") {
    return "Booking-related payment recorded successfully.";
  }

  return "Payment record stored in your accommodation history.";
}

export default function PaymentsDashboardPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [housingGroup, setHousingGroup] = useState(null);
  const [rentStatus, setRentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingRent, setPayingRent] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);

  const loadAll = async ({ showLoader = true } = {}) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const [paymentsRes, housingRes, rentRes] = await Promise.allSettled([
        getMyPaymentHistoryApi(),
        getMyCurrentHousingGroupApi(),
        getRentStatusApi(),
      ]);

      if (paymentsRes.status === "fulfilled") {
        setPayments(paymentsRes.value.data.payments || []);
      }
      if (housingRes.status === "fulfilled") {
        setHousingGroup(housingRes.value.data.housingGroup || null);
      }
      if (rentRes.status === "fulfilled") {
        setRentStatus(rentRes.value.data || null);
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (housingGroup?._id) {
      checkReviewExistsApi(housingGroup._id)
        .then(({ data }) => {
          setHasReviewed(data.hasReviewed);
          setExistingReview(data.review);
        })
        .catch(() => { });
    }
  }, [housingGroup?._id]);

  const handleSubmitAccommodationReview = async ({ rating, comment }) => {
    try {
      setSubmittingReview(true);
      await createReviewApi({ entityType: "ACCOMMODATION", entityId: housingGroup._id, rating, comment });
      toast.success("Review submitted!");
      setHasReviewed(true);
      setReviewModalOpen(false);
      const { data } = await checkReviewExistsApi(housingGroup._id);
      setExistingReview(data.review);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handlePayRent = async () => {
    if (!rentStatus?.housingGroupId) return;
    try {
      setPayingRent(true);
      await payMonthlyRentApi(rentStatus.housingGroupId);
      toast.success("Rent paid successfully!");
      await loadAll({ showLoader: false });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to pay rent");
    } finally {
      setPayingRent(false);
    }
  };

  const totals = useMemo(() => {
    const paid = payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalPayments: payments.length,
      totalPaid: paid,
      upfrontPayments: payments.filter((p) => ["BOOKING", "KEY_MONEY"].includes(p.type)).length,
      rentPayments: payments.filter((p) => p.type === "RENT").length,
    };
  }, [payments]);

  const sortedPayments = useMemo(() => {
    return [...payments].sort((left, right) => {
      const leftTime = new Date(left.createdAt || 0).getTime();
      const rightTime = new Date(right.createdAt || 0).getTime();
      return rightTime - leftTime;
    });
  }, [payments]);

  const nextBillingLabel = rentStatus?.nextBillingDate
    ? formatDate(rentStatus.nextBillingDate, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    : "Not scheduled";

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Student Accommodation"
        title="Payments"
        description="Review your booking and rent payments, current housing details, and move-in progress."
        backgroundImage={dashboardBanner}
        compact
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Payment records" value={totals.totalPayments} tone="indigo" icon={CreditCard} />
        <StatCard
          title="Total paid"
          value={formatCurrency(totals.totalPaid)}
          tone="emerald"
          icon={Wallet}
        />
        <StatCard title="Upfront payments" value={totals.upfrontPayments} tone="blue" icon={House} />
        <StatCard title="Rent payments" value={totals.rentPayments} tone="amber" icon={CalendarDays} />
      </div>

      {loading ? (
        <LoadingState
          title="Loading payment records"
          description="Collecting booking payments, rent status, and housing group information."
        />
      ) : null}

      {rentStatus?.hasHousingGroup && rentStatus?.nextBillingDate && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
          <div className={`h-1.5 ${rentStatus.alreadyPaid
            ? "bg-gradient-to-r from-emerald-400 to-teal-400"
            : rentStatus.canPayNow
              ? "bg-gradient-to-r from-indigo-500 to-blue-500"
              : "bg-gradient-to-r from-slate-300 to-slate-400"
            }`} />
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                <CalendarDays size={12} strokeWidth={2.4} />
                Rent Billing
              </div>
              <h4 className="mt-1.5 text-lg font-bold text-slate-900">Next rent payment</h4>
              <p className="mt-1 text-sm text-slate-600">
                Due date:{" "}
                <span className="font-semibold">
                  {formatDate(rentStatus.nextBillingDate, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>
              {rentStatus.canPayNow && !rentStatus.alreadyPaid && (
                <p className="mt-1 text-sm text-indigo-600">
                  Payment window is open — pay any time before{" "}
                  <span className="font-semibold">
                    {formatDate(rentStatus.windowEnd)}
                  </span>
                </p>
              )}
              {!rentStatus.canPayNow && !rentStatus.alreadyPaid && rentStatus.windowStart && (
                <p className="mt-1 text-sm text-amber-600">
                  Payment window opens on{" "}
                  <span className="font-semibold">
                    {formatDate(rentStatus.windowStart)}
                  </span>
                </p>
              )}
              {rentStatus.alreadyPaid && (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                  <CheckCircle2 size={14} strokeWidth={2.2} />
                  Rent paid for this billing cycle
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="text-[1.65rem] font-black tracking-tight text-slate-900">
                {formatCurrency(rentStatus.rentAmount)}
              </div>
              {rentStatus.canPayNow && !rentStatus.alreadyPaid && (
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-5 text-sm font-bold text-white shadow-md shadow-slate-900/15 transition-all duration-200 hover:from-slate-800 hover:to-slate-700 hover:shadow-lg active:scale-[0.98]"
                  onClick={handlePayRent}
                  disabled={payingRent}
                >
                  {payingRent ? "Processing..." : "Pay Rent Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {housingGroup && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                Housing Group
              </div>
              <h4 className="mt-1.5 text-lg font-bold text-slate-900">Current housing group</h4>
              <p className="mt-1 text-sm text-slate-500">
                {housingGroup.listingId?.title} • {housingGroup.listingId?.location?.city} /{" "}
                {housingGroup.listingId?.location?.area}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {housingGroup.listingId?._id && (
                <button
                  type="button"
                  onClick={() => navigate("/student/chat", { state: { listingId: housingGroup.listingId._id, listingTitle: housingGroup.listingId?.title } })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-100 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97]"
                  title="Chat with landlord"
                >
                  <MessageSquare size={13} strokeWidth={2.2} />
                  Chat landlord
                </button>
              )}
              <StatusBadge value={housingGroup.status} />
            </div>
          </div>

          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Key money paid", done: housingGroup.moveInChecklist?.keyMoneyPaid },
              { label: "Key received", done: housingGroup.moveInChecklist?.keyReceived },
              { label: "Inventory confirmed", done: housingGroup.moveInChecklist?.inventoryConfirmed },
              { label: "Next billing date", value: nextBillingLabel },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 bg-white px-5 py-4">
                {item.value !== undefined ? (
                  <CalendarDays size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-blue-400" />
                ) : item.done ? (
                  <CheckCircle2 size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-slate-300" />
                )}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</div>
                  <div className="mt-0.5 text-sm font-bold text-slate-900">
                    {item.value !== undefined ? item.value : item.done ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Accommodation Review */}
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              <Star size={13} strokeWidth={2.2} className="text-amber-400" />
              Accommodation Review
            </div>
            {hasReviewed && existingReview ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} className={s <= existingReview.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-700">{existingReview.rating}/5</span>
                {existingReview.comment && (
                  <span className="hidden text-sm text-slate-500 sm:inline">— "{existingReview.comment}"</span>
                )}
              </div>
            ) : (
              <button
                onClick={() => setReviewModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-500 hover:to-indigo-400 hover:shadow-md active:scale-[0.98]"
              >
                <Star size={12} strokeWidth={2.4} />
                Rate your accommodation
              </button>
            )}
          </div>

          {/* Roommate Preferences */}
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              <Users size={13} strokeWidth={2.2} className="text-indigo-400" />
              Roommate Preferences
            </div>
            <button
              onClick={() => setPrefsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.97]"
            >
              <Users size={12} strokeWidth={2.2} />
              Set preferences
            </button>
          </div>
        </div>
      )}

      <ReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={handleSubmitAccommodationReview}
        title="Rate your accommodation"
        submitting={submittingReview}
      />

      {housingGroup && (
        <RoommatePreferencesModal
          open={prefsModalOpen}
          onClose={() => setPrefsModalOpen(false)}
          housingGroupId={housingGroup._id}
          initialPreferences={
            housingGroup.members?.find
              ? (housingGroup.members.find((m) => m.isPrimaryTenant)?.roommatePreferences ?? {})
              : {}
          }
          onSaved={() => { }}
        />
      )}

      {!loading && !housingGroup ? (
        <div className="card p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Housing Progress
          </div>
          <h4 className="mt-2 text-xl font-bold text-slate-900">No active housing group yet</h4>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your housing group appears after an accommodation booking is approved and the payment step is completed.
          </p>
        </div>
      ) : null}

      {!loading ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                Payment History
              </div>
              <h4 className="mt-1.5 text-lg font-bold text-slate-900">Recorded transactions</h4>
            </div>

            {sortedPayments.length > 0 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {sortedPayments.length} record{sortedPayments.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {sortedPayments.length === 0 ? (
            <EmptyState
              image={emptyPayments}
              imageAlt="No payments illustration"
              title="No payments yet"
              description="Booking and rent payments will appear here after your transactions are completed."
              action={
                <Link to="/student/bookings" className="btn-primary">
                  View bookings
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {sortedPayments.map((payment) => (
                <div key={payment._id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${payment.type === "KEY_MONEY" ? "bg-indigo-50 text-indigo-600"
                        : payment.type === "RENT" ? "bg-emerald-50 text-emerald-600"
                          : "bg-blue-50 text-blue-600"
                        }`}>
                        {payment.type === "RENT" ? (
                          <CalendarDays size={18} strokeWidth={2.2} />
                        ) : (
                          <Wallet size={18} strokeWidth={2.2} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {formatPaymentType(payment.type)}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {payment.createdAt ? formatDate(payment.createdAt, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }) : "Recently recorded"}
                          {payment.monthKey ? ` • ${payment.monthKey}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xl font-black tracking-tight text-slate-900">
                          {formatCurrency(payment.amount)}
                        </div>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <StatusBadge value={payment.status} />
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-100 bg-slate-50/40 px-5 py-2.5 sm:px-6">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <ReceiptText size={11} strokeWidth={2.2} className="text-slate-400" />
                        <span className="font-semibold text-slate-600">{payment.referenceId || payment._id}</span>
                      </span>
                      <span className="h-3 w-px bg-slate-200" />
                      <span>{getPaymentNote(payment)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}