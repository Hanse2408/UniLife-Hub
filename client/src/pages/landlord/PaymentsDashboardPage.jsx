import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Filter,
  House,
  Mail,
  MessageSquare,
  Phone,
  ReceiptText,
  Search,
  SortAsc,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getLandlordPaymentHistoryApi } from "../../api/client";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import emptyPayments from "../../assets/illustrations/empty-payments.png";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";

function formatCurrency(amount) {
  return `LKR ${(amount || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "\u2014";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPaymentType(type) {
  if (type === "KEY_MONEY") return "Key Money";
  if (type === "BOOKING") return "Booking";
  if (type === "RENT") return "Rent";
  return type || "Payment";
}

function getPaymentNote(payment) {
  if (payment.type === "KEY_MONEY") {
    return "Key money was received and the move-in setup can continue from the landlord side.";
  }
  if (payment.type === "RENT") {
    return payment.monthKey
      ? `Monthly rent payment recorded for billing cycle ${payment.monthKey}.`
      : "Monthly rent payment recorded successfully.";
  }
  if (payment.type === "BOOKING") {
    return "Booking payment was received from the student and logged to the accommodation history.";
  }
  return "Payment record stored successfully.";
}

/* \u2500\u2500 Sub-components \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

function PaymentStatusBadge({ status }) {
  const map = {
    PAID: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70",
    FAILED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70",
    PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70",
    REFUNDED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70",
  };
  const labels = { PAID: "Paid", FAILED: "Failed", PENDING: "Pending", REFUNDED: "Refunded" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${map[status] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70"
        }`}
    >
      {labels[status] || String(status || "UNKNOWN").replaceAll("_", " ")}
    </span>
  );
}

function PaymentTypeBadge({ type }) {
  const map = {
    RENT: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/70",
    KEY_MONEY: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/70",
    BOOKING: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/70",
  };
  const labels = { RENT: "Rent", KEY_MONEY: "Key Money", BOOKING: "Booking" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${map[type] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70"
        }`}
    >
      {labels[type] || String(type || "PAYMENT").replaceAll("_", " ")}
    </span>
  );
}

function getTypeAccentStripe(type, status) {
  if (status === "FAILED") return "from-rose-500 to-pink-400";
  switch (type) {
    case "RENT": return "from-sky-500 to-cyan-400";
    case "KEY_MONEY": return "from-violet-500 to-purple-400";
    case "BOOKING": return "from-indigo-500 to-blue-400";
    default: return "from-slate-300 to-slate-400";
  }
}

function InfoBlock({ label, icon: Icon, children }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3.5 ring-1 ring-slate-100">
      <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {Icon ? <Icon size={12} strokeWidth={2.5} /> : null}
        {label}
      </div>
      {children}
    </div>
  );
}

function PaymentRecordCard({ payment }) {
  const navigate = useNavigate();
  const accentStripe = getTypeAccentStripe(payment.type, payment.status);
  const isFailed = payment.status === "FAILED";
  const isPaid = payment.status === "PAID";
  const hasBooking = Boolean(payment.bookingId?._id);

  return (
    <div
      className={`card overflow-hidden transition-shadow hover:shadow-md${isFailed ? " ring-1 ring-rose-200/60" : ""
        }`}
    >
      {/* top accent stripe */}
      <div className={`h-1 w-full bg-gradient-to-r ${accentStripe}`} />

      <div className="p-5 sm:p-6">
        {/* \u2500\u2500 Row 1: Category + Amount + Status \u2500\u2500 */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                {formatPaymentType(payment.type)}
              </span>
              <PaymentTypeBadge type={payment.type} />
            </div>
            <div className="mt-1.5 text-2xl font-black tracking-tight text-slate-900">
              {formatCurrency(payment.amount)}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 pt-1">
            <PaymentStatusBadge status={payment.status} />
          </div>
        </div>

        {/* \u2500\u2500 Context panel \u2500\u2500 */}
        <div
          className={`mt-3.5 rounded-xl px-3.5 py-2.5 text-sm leading-6 ${isFailed
            ? "bg-rose-50 ring-1 ring-rose-100"
            : isPaid
              ? "bg-emerald-50 ring-1 ring-emerald-100"
              : "bg-slate-50 ring-1 ring-slate-100"
            }`}
        >
          <span
            className={`font-semibold ${isFailed ? "text-rose-800" : isPaid ? "text-emerald-800" : "text-slate-800"
              }`}
          >
            {isPaid ? "Payment confirmed." : isFailed ? "Payment failed." : "Payment pending."}
          </span>{" "}
          <span className={isFailed ? "text-rose-700" : isPaid ? "text-emerald-700" : "text-slate-500"}>
            {getPaymentNote(payment)}
          </span>
        </div>

        {/* \u2500\u2500 Content grid: Student + Metadata \u2500\u2500 */}
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          {/* Student block */}
          <InfoBlock label="Student" icon={Users}>
            <p className="text-sm font-bold text-slate-900">
              {payment.studentId?.fullName || "Unknown student"}
            </p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Mail size={11} strokeWidth={2.2} />
                <span className="truncate">{payment.studentId?.email || "No email"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Phone size={11} strokeWidth={2.2} />
                <span>{payment.studentId?.phone || "No phone"}</span>
              </div>
            </div>
          </InfoBlock>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <InfoBlock label="Reference">
              <p className="break-all text-[13px] font-semibold text-slate-700">
                {payment.referenceId
                  ? String(payment.referenceId).slice(-12).toUpperCase()
                  : String(payment._id).slice(-8).toUpperCase()}
              </p>
            </InfoBlock>

            <InfoBlock label="Billing month" icon={CalendarDays}>
              <p className="text-sm font-semibold text-slate-900">
                {payment.monthKey || "One-time"}
              </p>
            </InfoBlock>

            <InfoBlock label="Recorded on" icon={CalendarDays}>
              <p className="text-sm font-semibold text-slate-900">
                {formatDate(payment.paidAt || payment.createdAt)}
              </p>
            </InfoBlock>

            <InfoBlock label="Move-in start" icon={House}>
              <p className="text-sm font-semibold text-slate-900">
                {formatDate(payment.bookingId?.moveInDate || payment.housingGroupId?.startDate)}
              </p>
            </InfoBlock>

            <InfoBlock label="Related status">
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {payment.bookingId?.status ? (
                  <StatusBadge value={payment.bookingId.status} />
                ) : null}
                {payment.housingGroupId?.status ? (
                  <StatusBadge value={payment.housingGroupId.status} />
                ) : null}
                {!payment.bookingId?.status && !payment.housingGroupId?.status ? (
                  <span className="text-sm font-semibold text-slate-400">\u2014</span>
                ) : null}
              </div>
            </InfoBlock>

            <InfoBlock label="Category" icon={ReceiptText}>
              <div className="pt-0.5">
                <PaymentTypeBadge type={payment.type} />
              </div>
            </InfoBlock>
          </div>
        </div>

        {/* \u2500\u2500 Footer: ID + date + action \u2500\u2500 */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-4 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ReceiptText size={12} strokeWidth={2.2} />
              {String(payment._id).slice(-6).toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={12} strokeWidth={2.2} />
              {formatDate(payment.paidAt || payment.createdAt)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {payment.studentId?._id && (
              <button
                type="button"
                onClick={() => navigate("/landlord/chat", {
                  state: {
                    studentId: payment.studentId._id,
                    studentName: payment.studentId?.fullName,
                    listingId: payment.bookingId?.listingId ?? null,
                  }
                })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-100 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97]"
                title="Chat with student"
              >
                <MessageSquare size={12} strokeWidth={2.2} />
                Chat student
              </button>
            )}
            {hasBooking ? (
              <Link
                to="/landlord/bookings"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-100 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97]"
              >
                <ExternalLink size={12} strokeWidth={2.2} />
                View booking
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* \u2500\u2500 Page \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

export default function LandlordPaymentsDashboardPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await getLandlordPaymentHistoryApi();
        setPayments(data.payments || []);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load landlord payments");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totals = useMemo(() => {
    const totalAmount = payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    return {
      received: payments.length,
      amount: totalAmount,
      students: new Set(payments.map((p) => p.studentId?._id).filter(Boolean)).size,
      successful: payments.filter((p) => p.status === "PAID").length,
    };
  }, [payments]);

  const displayPayments = useMemo(() => {
    let result = [...payments];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.studentId?.fullName?.toLowerCase().includes(q) ||
          p.studentId?.email?.toLowerCase().includes(q) ||
          p.referenceId?.toLowerCase().includes(q) ||
          String(p._id).toLowerCase().includes(q),
      );
    }

    if (statusFilter) result = result.filter((p) => p.status === statusFilter);
    if (typeFilter) result = result.filter((p) => p.type === typeFilter);

    result.sort((a, b) => {
      if (sortOrder === "oldest")
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortOrder === "highest") return (b.amount || 0) - (a.amount || 0);
      if (sortOrder === "lowest") return (a.amount || 0) - (b.amount || 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return result;
  }, [payments, searchQuery, statusFilter, typeFilter, sortOrder]);

  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter || typeFilter);

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("");
    setTypeFilter("");
    setSortOrder("newest");
  }

  return (
    <div className="space-y-6">
      {/* \u2500\u2500 Hero \u2500\u2500 */}
      <PageHero
        eyebrow="LANDLORD WORKSPACE"
        title="Received Payments"
        description="Review accommodation income across booking, key money, and monthly rent payments from your students."
        backgroundImage={dashboardBanner}
        compact
      />

      {/* \u2500\u2500 KPI Cards \u2500\u2500 */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Payment records"
          value={totals.received}
          tone="indigo"
          icon={CreditCard}
        />
        <StatCard
          title="Total received"
          value={formatCurrency(totals.amount)}
          subtitle="from confirmed transactions"
          tone="emerald"
          icon={Wallet}
        />
        <StatCard
          title="Paying students"
          value={totals.students}
          tone="blue"
          icon={Users}
        />
        <StatCard
          title="Successful payments"
          value={totals.successful}
          tone="emerald"
          icon={CheckCircle2}
        />
      </div>

      {/* \u2500\u2500 Content \u2500\u2500 */}
      {loading ? (
        <LoadingState
          title="Loading payment history"
          description="Collecting booking and rent transactions for your landlord workspace."
        />
      ) : payments.length === 0 ? (
        <EmptyState
          image={emptyPayments}
          imageAlt="No landlord payments illustration"
          title="No payments received yet"
          description="Payments appear here after students complete booking or rent transactions for your listings."
          action={
            <Link to="/landlord/bookings" className="btn-primary">
              Review bookings
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* \u2500\u2500 Section header + Snapshot \u2500\u2500 */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Payment Log
              </div>
              <h4 className="mt-2 text-xl font-bold text-slate-900">
                Recent accommodation payments
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Every booking, key money, and rent transaction for your listings is recorded here.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-5 py-4 ring-1 ring-slate-100 text-right">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Snapshot
              </div>
              <div className="mt-2 text-xl font-black tracking-tight text-slate-900">
                {formatCurrency(totals.amount)}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">
                {totals.successful} successful transaction{totals.successful !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* \u2500\u2500 Toolbar \u2500\u2500 */}
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[180px] flex-1">
                <Search
                  size={15}
                  strokeWidth={2.1}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search student, reference\u2026"
                  className="input w-full pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="relative">
                <Filter
                  size={14}
                  strokeWidth={2.1}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  className="select pl-9 min-w-[150px]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="FAILED">Failed</option>
                  <option value="PENDING">Pending</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>

              <div className="relative">
                <ReceiptText
                  size={14}
                  strokeWidth={2.1}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  className="select pl-9 min-w-[150px]"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">All categories</option>
                  <option value="RENT">Rent</option>
                  <option value="KEY_MONEY">Key Money</option>
                  <option value="BOOKING">Booking</option>
                </select>
              </div>

              <div className="relative">
                <SortAsc
                  size={14}
                  strokeWidth={2.1}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  className="select pl-9 min-w-[160px]"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="highest">Highest amount</option>
                  <option value="lowest">Lowest amount</option>
                </select>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-100 hover:bg-slate-50 active:scale-[0.97]"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                ) : null}
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                  {displayPayments.length} record{displayPayments.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* \u2500\u2500 Payment cards \u2500\u2500 */}
          {displayPayments.length > 0 ? (
            <div className="space-y-4">
              {displayPayments.map((payment) => (
                <PaymentRecordCard key={payment._id} payment={payment} />
              ))}
            </div>
          ) : (
            <div className="card px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-500">
                No payments match your current filters.
              </p>
              <button
                type="button"
                className="btn-secondary mt-4 text-sm"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}