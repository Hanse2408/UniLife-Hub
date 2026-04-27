import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
    getNotificationsApi,
    markAllNotificationsReadApi,
    markNotificationReadApi,
} from "../../api/client";
import EmptyState from "../../components/common/EmptyState";
import PageHero from "../../components/common/PageHero";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/StatusBadge";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import emptyNotifications from "../../assets/illustrations/empty-notifications.png";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState("ALL");

    const loadNotifications = async () => {
        const { data } = await getNotificationsApi();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const handleMarkOne = async (id) => {
        try {
            await markNotificationReadApi(id);
            toast.success("Notification marked as read");
            loadNotifications();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to update notification");
        }
    };

    const handleMarkAll = async () => {
        try {
            await markAllNotificationsReadApi();
            toast.success("All notifications marked as read");
            loadNotifications();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to update notifications");
        }
    };

    const filteredNotifications = useMemo(() => {
        if (filter === "UNREAD") return notifications.filter((n) => !n.isRead);
        return notifications;
    }, [notifications, filter]);

    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Communication Center"
                title="Notifications"
                description="Get updates on your bookings, payments, support tickets, and messages."
                backgroundImage={dashboardBanner}
            />

            <div className="grid gap-4 md:grid-cols-2">
                <StatCard title="Total notifications" value={notifications.length} tone="indigo" icon="🔔" />
                <StatCard title="Unread" value={unreadCount} tone="rose" icon="📌" />
            </div>

            <div className="flex gap-3">
                <button
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${filter === "ALL"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-700 border border-slate-200"
                        }`}
                    onClick={() => setFilter("ALL")}
                >
                    All
                </button>

                <button
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${filter === "UNREAD"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-700 border border-slate-200"
                        }`}
                    onClick={() => setFilter("UNREAD")}
                >
                    Unread
                </button>
            </div>

            {filteredNotifications.length === 0 ? (
                <EmptyState
                    image={emptyNotifications}
                    imageAlt="No notifications illustration"
                    title="No notifications yet"
                    description="Notifications for bookings, payments, tickets, and messages will appear here."
                />
            ) : (
                <div className="space-y-4">
                    {filteredNotifications.map((notification) => (
                        <div
                            key={notification._id}
                            className={`card p-5 transition ${notification.isRead ? "opacity-95" : "ring-2 ring-indigo-100"
                                }`}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-lg font-bold text-slate-900">{notification.title}</h4>
                                        <StatusBadge value={notification.type} />
                                        {!notification.isRead && (
                                            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                                                NEW
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-2 text-slate-600">{notification.message}</p>

                                    <p className="mt-3 text-sm text-slate-400">
                                        {new Date(notification.createdAt).toLocaleString()}
                                    </p>
                                </div>

                                {!notification.isRead && (
                                    <button
                                        className="btn-secondary"
                                        onClick={() => handleMarkOne(notification._id)}
                                    >
                                        Mark read
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
