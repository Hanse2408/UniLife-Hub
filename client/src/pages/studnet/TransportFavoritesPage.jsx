import {
    MapPin,
    Plus,
    Search,
    Star,
    Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageHero from "../../components/common/PageHero";
import EmptyState from "../../components/common/EmptyState";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import {
    getFavoriteLocationsApi,
    addFavoriteLocationApi,
    removeFavoriteLocationApi,
} from "../../api/client";

export default function TransportFavoritesPage() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addMode, setAddMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const loadFavorites = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await getFavoriteLocationsApi();
            setFavorites(data.favorites || []);
        } catch {
            toast.error("Failed to load favorites");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadFavorites(); }, [loadFavorites]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            setSearching(true);
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ", Sri Lanka")}&limit=5&countrycodes=lk`
            );
            const data = await res.json();
            setSearchResults(data);
        } catch {
            toast.error("Search failed");
        } finally {
            setSearching(false);
        }
    };

    const handleAdd = async (item) => {
        const name = item.display_name.split(",")[0];
        try {
            const { data } = await addFavoriteLocationApi({
                name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
            });
            setFavorites((prev) => [data.favorite, ...prev]);
            setSearchResults([]);
            setSearchQuery("");
            setAddMode(false);
            toast.success(`"${name}" added to favorites`);
        } catch (err) {
            if (err?.response?.status === 409) toast.error("Already saved");
            else toast.error("Failed to add");
        }
    };

    const handleRemove = async (id, name) => {
        try {
            await removeFavoriteLocationApi(id);
            setFavorites((prev) => prev.filter((f) => f._id !== id));
            toast.success(`"${name}" removed`);
        } catch {
            toast.error("Failed to remove");
        }
    };

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Transport"
                title="Favorite Locations"
                description="Save your frequently used pickup and drop-off locations for quick access."
                backgroundImage={dashboardBanner}
            />

            {/* Add New */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Saved Locations</h3>
                    <button
                        onClick={() => setAddMode(!addMode)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                        <Plus size={14} /> Add Location
                    </button>
                </div>

                {addMode && (
                    <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Search location in Sri Lanka..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                                className="input flex-1"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={searching}
                                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Search size={16} />
                            </button>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white max-h-48 overflow-y-auto">
                                {searchResults.map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleAdd(item)}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50 border-b border-slate-100 last:border-0 flex items-center gap-2"
                                    >
                                        <MapPin size={14} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{item.display_name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                    </div>
                ) : favorites.length === 0 ? (
                    <EmptyState
                        icon="⭐"
                        title="No favorites saved"
                        description='Click "Add Location" to save your frequently used spots.'
                    />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {favorites.map((fav) => (
                            <div
                                key={fav._id}
                                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-amber-300 transition"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                                        <Star size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 truncate">{fav.name}</div>
                                        <div className="text-xs text-slate-500">
                                            {fav.lat?.toFixed(4)}, {fav.lng?.toFixed(4)}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemove(fav._id, fav.name)}
                                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 shrink-0"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
