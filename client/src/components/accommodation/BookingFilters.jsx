import { Filter, Search, SortAsc } from "lucide-react";

export default function BookingFilters({
    statusFilter,
    onStatusChange,
    searchQuery,
    onSearchChange,
    sortOrder,
    onSortChange,
}) {
    return (
        <div className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1">
                    <Search
                        size={15}
                        strokeWidth={2.1}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        className="input w-full pl-9"
                        placeholder="Search by student, email, or property\u2026"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>

                {/* Status filter */}
                <div className="relative">
                    <Filter
                        size={14}
                        strokeWidth={2.1}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <select
                        className="select pl-9 min-w-[160px]"
                        value={statusFilter}
                        onChange={(e) => onStatusChange(e.target.value)}
                    >
                        <option value="ALL">All statuses</option>
                        <option value="REQUESTED">Requested</option>
                        <option value="PAYMENT_PENDING">Payment pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </div>

                {/* Sort */}
                <div className="relative">
                    <SortAsc
                        size={14}
                        strokeWidth={2.1}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <select
                        className="select pl-9 min-w-[160px]"
                        value={sortOrder}
                        onChange={(e) => onSortChange(e.target.value)}
                    >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
