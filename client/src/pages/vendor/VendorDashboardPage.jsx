import {
  ClipboardList,
  Plus,
  Store,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getVendorFoodStatsApi, getVendorFoodItemsApi } from "../../api/client";
import PageHero from "../../components/common/PageHero";
import LoadingState from "../../components/common/LoadingState";
import StatCard from "../../components/common/StatCard";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

const initialStats = {
  totalFoodItems: 0,
  totalOrders: 0,
  pendingOrders: 0,
  deliveredOrders: 0,
  totalSales: 0,
};

function formatCurrency(amount) {
  return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getBacklogMessage(pendingOrders) {
  if (pendingOrders === 0) return "No active orders. Your queue is clear.";
  if (pendingOrders <= 3) return "Light queue. A good time to prep for the next rush.";
  return "Orders are coming in. Keep status updates flowing.";
}

function getSalesMessage(totalOrders, totalSales) {
  if (totalOrders === 0) return "Sales will appear here once orders start coming in.";
  if (totalSales < 5000) return "Early sales are building. Keep it up!";
  return "Sales are steady. Focus on delivery pace and menu quality.";
}

export default function VendorDashboardPage() {
  const [stats, setStats] = useState(initialStats);
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [statsRes, itemsRes] = await Promise.all([
          getVendorFoodStatsApi(),
          getVendorFoodItemsApi(),
        ]);
        setStats({ ...initialStats, ...(statsRes.data.stats || {}) });
        setFoodItems(itemsRes.data.foodItems || []);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load vendor summary");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Vendor Workspace"
        title="Your Vendor Dashboard"
        description="Manage your menu, track orders, and monitor sales."
        backgroundImage={dashboardBanner}
      />

      {loading ? (
        <LoadingState
          title="Loading dashboard"
          description="Fetching your menu, orders, and sales data."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Menu items"
              value={stats.totalFoodItems}
              subtitle="Active items on your menu."
              tone="amber"
              icon={UtensilsCrossed}
            />
            <StatCard
              title="Total orders"
              value={stats.totalOrders}
              subtitle="All orders received so far."
              tone="indigo"
              icon={ClipboardList}
            />
            <StatCard
              title="Open queue"
              value={stats.pendingOrders}
              subtitle="Orders awaiting preparation or delivery."
              tone="blue"
              icon={Store}
            />
            <StatCard
              title="Total sales"
              value={formatCurrency(stats.totalSales)}
              subtitle={`${stats.deliveredOrders} delivered · ${stats.totalOrders} total orders`}
              tone="emerald"
              icon={Wallet}
            />
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Quick navigation</div>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Manage your food business</h3>
              </div>
              <Link to="/vendor/items" className="btn-primary inline-flex items-center gap-2">
                <Plus size={15} />
                Add Food
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link to="/vendor/items" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-amber-200 hover:bg-amber-50/40">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><UtensilsCrossed size={18} /></div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 group-hover:text-amber-700">Menu Items</div>
                  <div className="mt-0.5 text-xs text-slate-500">Add dishes, edit pricing, manage availability.</div>
                </div>
              </Link>
              <Link to="/vendor/orders" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/40">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"><ClipboardList size={18} /></div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-700">Orders</div>
                  <div className="mt-0.5 text-xs text-slate-500">View and update order status.</div>
                </div>
              </Link>
              <Link to="/vendor/sales" className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-emerald-200 hover:bg-emerald-50/40">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Wallet size={18} /></div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">Sales</div>
                  <div className="mt-0.5 text-xs text-slate-500">Track revenue and delivery stats.</div>
                </div>
              </Link>
            </div>
          </div>

          {foodItems.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Your catalog</div>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">Food Items</h3>
                </div>
                <Link to="/vendor/items" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View all →</Link>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {foodItems.slice(0, 8).map((item) => (
                  <div key={item._id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="mb-3 h-28 w-full rounded-xl object-cover" />
                    )}
                    <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-indigo-600">{formatCurrency(item.price)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}