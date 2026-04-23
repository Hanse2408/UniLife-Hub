import {
    Building2,
    Filter,
    MapPin,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Wallet,
} from "lucide-react";

export default function ListingFilters({
    filters,
    onChange,
    onSubmit,
    onReset,
    loading = false,
    activeFilters = 0,
    resultCount,
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {/* Header bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <SlidersHorizontal size={15} strokeWidth={2.2} className="text-slate-400" />
                    Filters
                    {activeFilters > 0 && (
                        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] font-bold text-white">
                            {activeFilters}
                        </span>
                    )}
                </div>
                {typeof resultCount === "number" && (
                    <span className="text-xs text-slate-500">
                        {resultCount} listing{resultCount !== 1 ? "s" : ""} found
                    </span>
                )}
            </div>

            {/* Filter form */}
            <form className="p-4" onSubmit={onSubmit}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5">
                    {/* City */}
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            <Building2 size={12} /> City
                        </label>
                        <input
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="Colombo"
                            value={filters.city}
                            onChange={(e) => onChange("city", e.target.value)}
                        />
                    </div>

                    {/* Area */}
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            <MapPin size={12} /> Area
                        </label>
                        <input
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="Malabe"
                            value={filters.area}
                            onChange={(e) => onChange("area", e.target.value)}
                        />
                    </div>

                    {/* Room Type */}
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            <Building2 size={12} /> Room Type
                        </label>
                        <select
                            className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 bg-[length:14px] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-sm text-slate-800 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            style={{
                                backgroundImage:
                                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                            }}
                            value={filters.roomType}
                            onChange={(e) => onChange("roomType", e.target.value)}
                        >
                            <option value="">All types</option>
                            <option value="SINGLE">Single</option>
                            <option value="SHARED">Shared</option>
                            <option value="ANNEX">Annex</option>
                            <option value="APARTMENT">Apartment</option>
                            <option value="HOUSE">House</option>
                        </select>
                    </div>

                    {/* Min Rent */}
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            <Wallet size={12} /> Min Rent
                        </label>
                        <input
                            type="number"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="25,000"
                            value={filters.minRent}
                            onChange={(e) => onChange("minRent", e.target.value)}
                        />
                    </div>

                    {/* Max Rent */}
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            <Wallet size={12} /> Max Rent
                        </label>
                        <input
                            type="number"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="60,000"
                            value={filters.maxRent}
                            onChange={(e) => onChange("maxRent", e.target.value)}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center gap-2 sm:justify-end">
                    <button
                        type="button"
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                        onClick={onReset}
                    >
                        <RotateCcw size={13} />
                        Reset
                    </button>
                    <button
                        type="submit"
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                        disabled={loading}
                    >
                        <Search size={13} />
                        {loading ? "Searching…" : "Search"}
                    </button>
                </div>
            </form>
        </div>
    );
}
