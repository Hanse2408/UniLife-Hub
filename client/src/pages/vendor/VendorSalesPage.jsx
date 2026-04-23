import { BarChart3, ClipboardList, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getVendorFoodStatsApi } from "../../api/client";
import LoadingState from "../../components/common/LoadingState";
import PageHero from "../../components/common/PageHero";
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

function formatPercent(value) {
	return `${Math.round(value)}%`;
}

export default function VendorSalesPage() {
	const [stats, setStats] = useState(initialStats);
	const [loading, setLoading] = useState(true);

	const loadStats = async () => {
		try {
			setLoading(true);
			const { data } = await getVendorFoodStatsApi();
			setStats({ ...initialStats, ...(data.stats || {}) });
		} catch (error) {
			toast.error(error?.response?.data?.message || "Failed to load sales summary");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadStats();
	}, []);

	const averageOrderValue = stats.totalOrders ? stats.totalSales / stats.totalOrders : 0;
	const completionRate = stats.totalOrders
		? (stats.deliveredOrders / stats.totalOrders) * 100
		: 0;

	return (
		<div className="space-y-6">
			<PageHero
				eyebrow="Vendor Sales"
				title="Sales Overview"
				description="See your revenue, order totals, and delivery performance."
				backgroundImage={dashboardBanner}
			/>

			{loading ? (
				<LoadingState
					title="Loading sales"
					description="Fetching your revenue and order data."
				/>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<StatCard
						title="Total sales"
						value={formatCurrency(stats.totalSales)}
						subtitle={`From ${stats.totalOrders} orders`}
						tone="emerald"
						icon={Wallet}
					/>
					<StatCard
						title="Total orders"
						value={stats.totalOrders}
						subtitle={`${stats.deliveredOrders} delivered · ${stats.pendingOrders} pending`}
						tone="indigo"
						icon={ClipboardList}
					/>
					<StatCard
						title="Average order"
						value={formatCurrency(averageOrderValue)}
						subtitle="Average revenue per order"
						tone="blue"
						icon={BarChart3}
					/>
					<StatCard
						title="Completion rate"
						value={formatPercent(completionRate)}
						subtitle={`${stats.deliveredOrders} of ${stats.totalOrders} orders delivered`}
						tone="amber"
						icon="📈"
					/>
				</div>
			)}
		</div>
	);
}
