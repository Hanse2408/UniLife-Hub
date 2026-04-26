import {
  Bath,
  BedDouble,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  House,
  Info,
  MapPin,
  MessageSquareText,
  Receipt,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getListingByIdApi, getListingRoommatesApi, sendMessageApi } from "../../api/client";
import BookingRequestModal from "../../components/accommodation/BookingRequestModal";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import listingPlaceholder from "../../assets/placeholders/listing-placeholder.png";

function formatCurrency(amount) {
  return `LKR ${(amount || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ── Facility icon helper ── */
const facilityIcons = {
  wifi: Zap, "wi-fi": Zap, internet: Zap,
  parking: House, kitchen: House, laundry: Bath,
  bathroom: Bath, "hot water": Bath, furniture: BedDouble, furnished: BedDouble,
};
function getFacilityIcon(name) {
  const key = name.toLowerCase();
  for (const [k, Icon] of Object.entries(facilityIcons)) {
    if (key.includes(k)) return Icon;
  }
  return Sparkles;
}

/* ── Preference label map ── */
const PREF_LABELS = {
  sleepSchedule: { label: "Sleep", map: { EARLY_BIRD: "Early bird", NIGHT_OWL: "Night owl", FLEXIBLE: "Flexible" } },
  workSchedule: { label: "Schedule", map: { WEEKDAYS: "Weekdays", WEEKENDS: "Weekends", REMOTE: "Remote/WFH", MIXED: "Mixed" } },
  cleanlinessLevel: { label: "Cleanliness", map: { VERY_TIDY: "Very tidy", TIDY: "Tidy", RELAXED: "Relaxed" } },
  guestPolicy: { label: "Guests", map: { NO_GUESTS: "No guests", OCCASIONAL: "Occasional", FREQUENT: "Frequent" } },
  noiseTolerance: { label: "Noise", map: { QUIET: "Quiet", MODERATE: "Moderate", LIVELY: "Lively" } },
  studyHabits: { label: "Study", map: { HOME_STUDIER: "Home studier", LIBRARY: "Library", MIXED: "Mixed" } },
  smokingPolicy: { label: "Smoking", map: { NON_SMOKER: "Non-smoker", OUTSIDE_ONLY: "Outside only", SMOKER: "Smoker" } },
  petsPolicy: { label: "Pets", map: { NO_PETS: "No pets", OKAY_WITH_PETS: "OK with pets", HAS_PETS: "Has pets" } },
};

export default function ListingDetailsPage() {
  const { id } = useParams();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeImage, setActiveImage] = useState(listingPlaceholder);
  const [activeIdx, setActiveIdx] = useState(0);
  const [roommates, setRoommates] = useState([]);

  const loadListing = async () => {
    try {
      setLoading(true);
      const { data } = await getListingByIdApi(id);
      setListing(data.listing || null);
      setActiveImage(data.listing?.photos?.[0] || listingPlaceholder);
      setActiveIdx(0);

      if (data.listing?.roomType === "SHARED") {
        try {
          const { data: rmData } = await getListingRoommatesApi(id);
          setRoommates(rmData.roommates || []);
        } catch (_) {
          // non-critical
        }
      }
    } catch (error) {
      setListing(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListing();
  }, [id]);

  const firstPaymentAmount = useMemo(() => {
    if (!listing) return "LKR 0";
    return listing.keyMoney > 0 ? formatCurrency(listing.keyMoney) : formatCurrency(listing.rent);
  }, [listing]);

  const landlordVerified = listing?.ownerId?.landlordVerificationStatus === "VERIFIED";

  const photos = listing?.photos?.length ? listing.photos : [listingPlaceholder];

  const handlePrevImage = () => {
    const idx = activeIdx === 0 ? photos.length - 1 : activeIdx - 1;
    setActiveIdx(idx);
    setActiveImage(photos[idx]);
  };
  const handleNextImage = () => {
    const idx = activeIdx === photos.length - 1 ? 0 : activeIdx + 1;
    setActiveIdx(idx);
    setActiveImage(photos[idx]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    try {
      setSendingMessage(true);
      await sendMessageApi({
        listingId: listing._id,
        body: message,
      });
      toast.success("Message sent to landlord");
      setMessage("");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading listing details"
        description="Preparing gallery, pricing, landlord information, and booking actions."
      />
    );
  }

  if (!listing) {
    return (
      <EmptyState
        icon="📭"
        tone="amber"
        title="Listing not found"
        description="This listing may no longer be available, or the link may be outdated."
        action={
          <Link to="/student/listings" className="btn-primary">
            Back to listings
          </Link>
        }
      />
    );
  }

  /* ── Property spec rows ── */
  const specRows = [
    { label: "Room type", value: listing.roomType, icon: House },
    { label: "Max occupants", value: listing.maxOccupants, icon: Users },
    { label: "Current occupancy", value: listing.currentOccupancy, icon: BedDouble },
    { label: "Bills included", value: listing.billsIncluded ? "Yes" : "No", icon: Zap },
    { label: "Available from", value: formatDate(listing.availableFrom), icon: Clock },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link
            to="/student/listings"
            className="inline-flex items-center gap-1 rounded font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
          >
            <ChevronLeft size={15} /> Listings
          </Link>
          <span className="text-slate-300">/</span>
          <span className="truncate font-medium text-slate-800">{listing.title}</span>
        </div>

        {/* ── Compact hero ── */}
        <section className="relative overflow-hidden rounded-2xl border border-indigo-200/40 shadow-lg shadow-indigo-100/30">
          <img
            src={activeImage || listingPlaceholder}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-sm"
            onError={(e) => { e.currentTarget.src = listingPlaceholder; }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-indigo-950/80 to-cyan-900/60" />

          <div className="relative z-10 px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/20 backdrop-blur-sm">
                <House size={12} strokeWidth={2.2} /> {listing.roomType}
              </span>
              {listing.billsIncluded && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30 backdrop-blur-sm">
                  <Zap size={12} strokeWidth={2.2} /> Bills included
                </span>
              )}
              <StatusBadge value={listing.status} />
              {landlordVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/20 px-2.5 py-1 text-[11px] font-bold text-sky-200 ring-1 ring-sky-400/30 backdrop-blur-sm">
                  <ShieldCheck size={12} strokeWidth={2.2} /> Verified
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-[1.75rem]">
              {listing.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} strokeWidth={2} className="text-cyan-300/70" /> {listing.location?.city}, {listing.location?.area}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={14} strokeWidth={2} className="text-indigo-300/70" /> {listing.currentOccupancy ?? 0}/{listing.maxOccupants ?? "-"} occupants
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} strokeWidth={2} className="text-amber-300/70" /> Available {formatDate(listing.availableFrom)}
              </span>
            </div>
          </div>
        </section>

        {/* ── Main 2-column layout ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">

          {/* ═══ LEFT COLUMN ═══ */}
          <div className="space-y-6">

            {/* ── Image gallery ── */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
              <div className="group relative aspect-[16/9] bg-slate-100">
                <img
                  src={activeImage || listingPlaceholder}
                  alt={listing.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  onError={(e) => { e.currentTarget.src = listingPlaceholder; }}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />

                {/* Photo count badge */}
                <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  <Camera size={13} strokeWidth={2} />
                  {photos.length} {photos.length === 1 ? "photo" : "photos"}
                </div>

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur-sm transition-all duration-200 hover:bg-white hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur-sm transition-all duration-200 hover:bg-white hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                      aria-label="Next image"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                      {activeIdx + 1} / {photos.length}
                    </div>
                  </>
                )}
              </div>

              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {photos.map((photo, idx) => (
                    <button
                      key={photo + idx}
                      className={`shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${activeIdx === idx
                        ? "border-indigo-500 shadow-md ring-2 ring-indigo-200"
                        : "border-transparent opacity-60 hover:opacity-100 hover:border-slate-300"
                        }`}
                      onClick={() => { setActiveIdx(idx); setActiveImage(photo); }}
                    >
                      <img
                        src={photo || listingPlaceholder}
                        alt={`Preview ${idx + 1}`}
                        className="h-16 w-20 object-cover"
                        onError={(e) => { e.currentTarget.src = listingPlaceholder; }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── About this property ── */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Info size={16} strokeWidth={2.2} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">About this property</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {listing.description || "No description has been provided yet."}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-xl border border-cyan-100 bg-cyan-50/40 p-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-100 text-cyan-600">
                    <MapPin size={14} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-cyan-600/70">Address</div>
                    <p className="mt-0.5 text-sm text-slate-700">
                      {listing.location?.addressLine || "Address not provided"}, {listing.location?.city}, {listing.location?.area}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-600">
                    <CalendarDays size={14} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-600/70">How booking works</div>
                    <p className="mt-0.5 text-sm text-slate-700">
                      Submit a request → landlord approves → complete payment to confirm.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Property details / specs ── */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <House size={16} strokeWidth={2.2} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Property details</h2>
              </div>
              <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/40">
                {specRows.map(({ label, value, icon: RowIcon }, idx) => (
                  <div key={label} className={`flex items-center justify-between px-4 py-3.5 text-sm ${idx % 2 === 0 ? 'bg-white/60' : ''}`}>
                    <span className="flex items-center gap-2.5 text-slate-500">
                      <RowIcon size={14} strokeWidth={2} className="text-indigo-400/70" />
                      {label}
                    </span>
                    <span className="rounded-md bg-slate-100/80 px-2.5 py-0.5 font-semibold text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Facilities / amenities ── */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Sparkles size={16} strokeWidth={2.2} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Facilities & amenities</h2>
              </div>
              {listing.facilities?.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {listing.facilities.map((facility) => {
                    const Icon = getFacilityIcon(facility);
                    return (
                      <div
                        key={facility}
                        className="flex items-center gap-2.5 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-indigo-50/40 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-violet-200 hover:shadow-sm hover:text-violet-700"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100/80 text-violet-500">
                          <Icon size={13} strokeWidth={2.2} />
                        </div>
                        {facility}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No facilities listed.</p>
              )}
            </div>

            {/* ── Current roommates (SHARED listings only) ── */}
            {listing.roomType === "SHARED" && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Users size={16} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Current housemates</h2>
                    <p className="text-xs text-slate-400">Lifestyle preferences to help you find compatible roommates</p>
                  </div>
                </div>

                {roommates.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">No current housemates — you'd be the first!</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {roommates.map((rm, i) => {
                      const prefEntries = Object.entries(PREF_LABELS)
                        .map(([key, cfg]) => {
                          const val = rm.preferences?.[key];
                          return val ? { label: cfg.label, display: cfg.map[val] || val } : null;
                        })
                        .filter(Boolean);

                      return (
                        <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-sm font-bold text-white">
                              {(rm.name || "R")[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{rm.name}</div>
                              {rm.preferences?.bio && (
                                <p className="mt-0.5 text-xs text-slate-500 italic">"{rm.preferences.bio}"</p>
                              )}
                            </div>
                          </div>

                          {prefEntries.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {prefEntries.map(({ label, display }) => (
                                <span
                                  key={label}
                                  className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"
                                >
                                  {label}: {display}
                                </span>
                              ))}
                            </div>
                          )}

                          {prefEntries.length === 0 && !rm.preferences?.bio && (
                            <p className="mt-2 text-xs text-slate-400">Preferences not set yet.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══ RIGHT SIDEBAR ═══ */}
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">

            {/* ── Pricing & booking card ── */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-indigo-100/40">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {formatCurrency(listing.rent)}
                  </span>
                  <span className="text-sm font-medium text-slate-400">/ month</span>
                </div>
                {listing.keyMoney > 0 && (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-200/60">
                    <Wallet size={12} strokeWidth={2.2} /> + {formatCurrency(listing.keyMoney)} key money
                  </div>
                )}
              </div>

              <div className="space-y-3 p-5">
                {/* Quick details */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-500">
                      <House size={14} className="text-slate-400" /> Room type
                    </span>
                    <span className="font-medium text-slate-800">{listing.roomType}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-500">
                      <Users size={14} className="text-slate-400" /> Occupancy
                    </span>
                    <span className="font-medium text-slate-800">
                      {listing.currentOccupancy ?? 0}/{listing.maxOccupants ?? "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-500">
                      <CalendarDays size={14} className="text-slate-400" /> Available
                    </span>
                    <span className="font-medium text-slate-800">{formatDate(listing.availableFrom)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-500">
                      <Zap size={14} className="text-slate-400" /> Bills included
                    </span>
                    <span className="font-medium text-slate-800">{listing.billsIncluded ? "Yes" : "No"}</span>
                  </div>
                </div>

                {/* First payment info */}
                <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-blue-50/60 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                    <Receipt size={13} strokeWidth={2.2} /> First payment
                  </div>
                  <div className="mt-1.5 text-sm font-bold text-indigo-900">
                    {listing.keyMoney > 0
                      ? `${formatCurrency(listing.keyMoney)} (key money)`
                      : `${formatCurrency(listing.rent)} (first month)`}
                  </div>
                  <div className="mt-0.5 text-[11px] text-indigo-500">
                    Next billing 30 days after move-in
                  </div>
                </div>

                {/* CTA */}
                <button
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-sm font-bold text-white shadow-md shadow-slate-900/20 transition-all duration-200 hover:from-slate-800 hover:to-slate-700 hover:shadow-lg hover:shadow-slate-900/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:scale-[0.98]"
                  onClick={() => setBookingOpen(true)}
                >
                  Request Booking
                </button>
              </div>
            </div>

            {/* ── Landlord card ── */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-indigo-100/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                  <Users size={15} strokeWidth={2.2} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Landlord</h3>
              </div>
              <div className="mt-3.5 flex items-center gap-3 rounded-xl bg-slate-50/60 p-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-bold text-white ring-2 ring-white shadow-md shadow-indigo-200/40">
                  {(listing.ownerId?.fullName || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">{listing.ownerId?.fullName}</div>
                  <div className="truncate text-xs text-slate-400">{listing.ownerId?.email}</div>
                </div>
              </div>
              <div className="mt-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${landlordVerified
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20 shadow-sm shadow-emerald-100"
                    : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                    }`}
                >
                  {landlordVerified ? <><ShieldCheck size={12} strokeWidth={2.2} /> Verified landlord</> : "Verification pending"}
                </span>
              </div>
            </div>

            {/* ── Contact landlord ── */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-indigo-100/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <MessageSquareText size={15} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Contact landlord</h3>
                  <p className="text-[11px] text-slate-400">Ask a question before booking</p>
                </div>
              </div>

              <form className="mt-4 space-y-3" onSubmit={handleSendMessage}>
                <textarea
                  rows="4"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-300 focus:bg-white focus:shadow-sm focus:shadow-blue-100/40 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Hi, I'm interested in this room. Is it still available?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !message.trim()}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  <Send size={13} />
                  {sendingMessage ? "Sending…" : "Send message"}
                </button>
              </form>
            </div>

            {/* ── What happens next ── */}
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-5 shadow-sm ring-1 ring-indigo-100/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Clock size={15} strokeWidth={2.2} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">What happens next?</h3>
              </div>
              <ol className="mt-4 space-y-3">
                {[
                  { step: "1", text: "Submit a booking request", color: "bg-blue-100 text-blue-700" },
                  { step: "2", text: "Landlord reviews & approves", color: "bg-amber-100 text-amber-700" },
                  { step: "3", text: "Complete payment to confirm", color: "bg-emerald-100 text-emerald-700" },
                ].map(({ step, text, color }, idx, arr) => (
                  <li key={step} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${color}`}>
                        {step}
                      </span>
                      {idx < arr.length - 1 && <div className="mt-1 h-4 w-px bg-slate-200" />}
                    </div>
                    <span className="pt-1 text-sm text-slate-600">{text}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

        </div>
      </div>

      <BookingRequestModal
        listing={listing}
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onSuccess={loadListing}
      />
    </>
  );
}
