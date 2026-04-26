import {
  CalendarDays,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
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

const statusColor = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  UNAVAILABLE: "bg-slate-50 text-slate-600 ring-slate-500/20",
  SUSPENDED: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const roomTypeColor = {
  SINGLE: "bg-sky-50 text-sky-700",
  SHARED: "bg-violet-50 text-violet-700",
  ANNEX: "bg-amber-50 text-amber-700",
  APARTMENT: "bg-teal-50 text-teal-700",
  HOUSE: "bg-rose-50 text-rose-700",
};

export default function ListingCard({ listing }) {
  const photo = listing?.photos?.[0] || listingPlaceholder;
  const isVerified = listing.ownerId?.landlordVerificationStatus === "VERIFIED";

  const allAmenities = [
    ...(listing.facilities || []),
    ...(listing.billsIncluded ? ["Bills included"] : []),
  ];
  const visibleAmenities = allAmenities.slice(0, 3);
  const extraCount = allAmenities.length - 3;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg">
      {/* ── Image ── */}
      <Link
        to={`/student/listings/${listing._id}`}
        className="relative block aspect-[16/10] overflow-hidden bg-slate-100"
      >
        <img
          src={photo}
          alt={listing.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = listingPlaceholder;
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Top badges */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${roomTypeColor[listing.roomType] || "bg-slate-100 text-slate-700"
              }`}
          >
            {listing.roomType}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusColor[listing.status] || "bg-slate-50 text-slate-600 ring-slate-500/20"
              }`}
          >
            {String(listing.status || "").replaceAll("_", " ")}
          </span>
        </div>

        {/* Rent on image */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[22px] font-extrabold leading-none text-white drop-shadow-sm">
                {formatCurrency(listing.rent)}
              </span>
              <span className="ml-1 text-xs font-medium text-white/70">/mo</span>
            </div>
            {isVerified && (
              <span className="flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 shadow-sm backdrop-blur-sm">
                <ShieldCheck size={12} />
                Verified
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title & location */}
        <Link to={`/student/listings/${listing._id}`} className="block">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-900 transition group-hover:text-indigo-600">
            {listing.title}
          </h3>
        </Link>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin size={12} strokeWidth={2.2} className="shrink-0 text-slate-400" />
          <span className="truncate">
            {listing.location?.city} / {listing.location?.area}
          </span>
        </p>

        {/* Meta row */}
        <div className="mt-3 grid grid-cols-3 divide-x divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/80">
          <div className="px-2.5 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Key Money
            </div>
            <div className="mt-0.5 text-xs font-bold text-slate-800">
              {listing.keyMoney > 0 ? formatCurrency(listing.keyMoney) : "None"}
            </div>
          </div>
          <div className="px-2.5 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Occupancy
            </div>
            <div className="mt-0.5 text-xs font-bold text-slate-800">
              {listing.currentOccupancy ?? 0}/{listing.maxOccupants ?? "–"}
            </div>
          </div>
          <div className="px-2.5 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Available
            </div>
            <div className="mt-0.5 text-xs font-bold text-slate-800">
              {formatDate(listing.availableFrom)}
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleAmenities.map((item) => (
            <span
              key={item}
              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600"
            >
              {item}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              +{extraCount} more
            </span>
          )}
        </div>

        {/* Spacer to push CTA to bottom */}
        <div className="flex-1" />

        {/* CTA */}
        <div className="mt-4 flex gap-2">
          <Link
            to={`/student/listings/${listing._id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            View Details
          </Link>
          <Link
            to={`/student/chat`}
            state={{ listingId: listing._id, listingTitle: listing.title }}
            className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            title="Message landlord"
          >
            <MessageCircle size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}