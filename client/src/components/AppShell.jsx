import {
    Bell,
    BookOpenText,
    Building2,
    Bus,
    ClipboardList,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageSquare,
    ScrollText,
    ShieldCheck,
    Star,
    Store,
    UserRound,
    Users,
    UtensilsCrossed,
    Wallet,
    Wrench,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getInboxApi, getNotificationsApi, getUserRatingApi } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import BrandLogo from "./common/BrandLogo";
import { getSocket } from "../sockets/socket";

const navConfig = {
    STUDENT: [
        {
            to: "/student/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            hint: "Your portal overview and quick actions.",
        },
        {
            to: "/student/accommodation",
            label: "Accommodation",
            icon: Building2,
            hint: "Listings, bookings, payments, and support tickets.",
            matchPaths: ["/student/listings", "/student/bookings", "/student/payments", "/student/tickets"],
        },
        {
            to: "/student/food",
            label: "Food",
            icon: UtensilsCrossed,
            hint: "Meals, orders, planning, and budget insights.",
        },
        {
            to: "/student/transport",
            label: "Transport",
            icon: Bus,
            hint: "Transport features and future integration.",
        },
        {
            to: "/student/profile",
            label: "Profile",
            icon: UserRound,
            hint: "Personal settings and account details.",
        },
        {
            to: "/student/notifications",
            label: "Notifications",
            icon: Bell,
            hint: "Stay updated on bookings, orders, and alerts.",
        },
    ],
    LANDLORD: [
        {
            to: "/landlord/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            hint: "Overview of your entire portfolio.",
        },
        {
            to: "/landlord/listings",
            label: "Accommodation",
            icon: Building2,
            hint: "Manage your property listings.",
        },
        {
            to: "/landlord/bookings",
            label: "Bookings",
            icon: ClipboardList,
            hint: "Review requests, approvals, and stays.",
        },
        {
            to: "/landlord/payments",
            label: "Payments",
            icon: Wallet,
            hint: "Tenant payment activity.",
        },
        {
            to: "/landlord/tickets",
            label: "Tickets",
            icon: Wrench,
            hint: "Handle maintenance issues.",
        },
        {
            to: "/landlord/chat",
            label: "Chat",
            icon: MessageSquare,
            hint: "Message students directly.",
        },
        {
            to: "/landlord/reviews",
            label: "Reviews",
            icon: BookOpenText,
            hint: "Tenant ratings and feedback.",
        },
        {
            to: "/landlord/notifications",
            label: "Notifications",
            icon: Bell,
            hint: "Activity and approval alerts.",
        },
    ],
    VENDOR: [
        {
            to: "/vendor/dashboard",
            label: "Dashboard",
            icon: Store,
            hint: "Vendor status, readiness, and performance summary.",
        },
        {
            to: "/vendor/items",
            label: "Add Food",
            icon: UtensilsCrossed,
            hint: "Create and manage your menu items.",
        },
        {
            to: "/vendor/orders",
            label: "Orders",
            icon: ScrollText,
            hint: "Track customer orders and fulfilment.",
        },
        {
            to: "/vendor/sales",
            label: "Sales",
            icon: Wallet,
            hint: "Review revenue and demand trends.",
        },
        {
            to: "/vendor/reviews",
            label: "Reviews",
            icon: BookOpenText,
            hint: "Ratings and reviews from your customers.",
        },
        {
            to: "/vendor/notifications",
            label: "Notifications",
            icon: Bell,
            hint: "Important admin and order updates.",
        },
    ],
    ADMIN: [
        {
            to: "/admin/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            hint: "Moderation queues and blockers across landlords, vendors, and listings.",
        },
        {
            to: "/admin/users",
            label: "Users",
            icon: Users,
            hint: "View, edit, suspend, and manage all user accounts.",
        },
        {
            to: "/admin/landlords",
            label: "Landlords",
            icon: ShieldCheck,
            hint: "Verify landlord accounts and compliance.",
        },
        {
            to: "/admin/vendors",
            label: "Vendors",
            icon: Store,
            hint: "Approve vendor onboarding and readiness.",
        },
        {
            to: "/admin/food/delivery",
            label: "Food Delivery",
            icon: UtensilsCrossed,
            hint: "Dispatch orders and confirm campus food deliveries.",
        },
        {
            to: "/admin/transport-managers",
            label: "Transport Mgrs",
            icon: Bus,
            hint: "Verify transport manager accounts.",
        },
        {
            to: "/admin/user-reviews",
            label: "User Reviews",
            icon: BookOpenText,
            hint: "All user reviews and ratings across the platform.",
        },
        {
            to: "/admin/notifications",
            label: "Notifications",
            icon: Bell,
            hint: "Platform-wide alerts and moderation updates.",
        },
    ],
    TRANSPORT_MANAGER: [
        {
            to: "/transport-manager/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            hint: "Overview of your transport routes and status.",
        },
        {
            to: "/transport-manager/create",
            label: "Add Route",
            icon: Bus,
            hint: "Create a new bus or van transport listing.",
        },
        {
            to: "/transport-manager/bookings",
            label: "Bookings & Payment",
            icon: Wallet,
            hint: "View passenger bookings and payment records.",
        },
        {
            to: "/transport-manager/reviews",
            label: "Reviews",
            icon: BookOpenText,
            hint: "Ratings and reviews from your passengers.",
        },
        {
            to: "/transport-manager/notifications",
            label: "Notifications",
            icon: Bell,
            hint: "Admin updates and approval notifications.",
        },
    ],
};

const utilityLinks = {
    STUDENT: [
        { to: "/student/chat", label: "Messages", icon: MessageSquare },
        { to: "/student/notifications", label: "Alerts", icon: Bell },
    ],
    LANDLORD: [
        { to: "/landlord/chat", label: "Messages", icon: MessageSquare },
        { to: "/landlord/notifications", label: "Alerts", icon: Bell },
    ],
    VENDOR: [{ to: "/vendor/notifications", label: "Alerts", icon: Bell }],
    ADMIN: [{ to: "/admin/notifications", label: "Alerts", icon: Bell }],
    TRANSPORT_MANAGER: [{ to: "/transport-manager/notifications", label: "Alerts", icon: Bell }],
};

const notificationsPath = {
    STUDENT: "/student/notifications",
    LANDLORD: "/landlord/notifications",
    VENDOR: "/vendor/notifications",
    ADMIN: "/admin/notifications",
    TRANSPORT_MANAGER: "/transport-manager/notifications",
};

const roleLabel = {
    STUDENT: "Student Portal",
    LANDLORD: "Landlord Console",
    VENDOR: "Vendor Console",
    ADMIN: "Admin Console",
};



function initials(name = "") {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function matchesPath(pathname, to) {
    return pathname === to || pathname.startsWith(`${to}/`);
}

export default function AppShell({ role }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [menuOpen, setMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [userRating, setUserRating] = useState(null);

    const showRating = ["LANDLORD", "VENDOR", "TRANSPORT_MANAGER"].includes(role);

    useEffect(() => {
        if (showRating && user?._id) {
            getUserRatingApi(user._id)
                .then(({ data }) => setUserRating(data))
                .catch(() => setUserRating(null));
        }
    }, [showRating, user?._id]);

    useEffect(() => {
        const loadUnread = async () => {
            try {
                const { data } = await getNotificationsApi();
                setUnreadCount(data.unreadCount || 0);
            } catch {
                setUnreadCount(0);
            }
        };
        loadUnread();

        // Load unread chat count for chat-enabled roles
        if (["LANDLORD", "STUDENT"].includes(role)) {
            getInboxApi()
                .then(({ data }) => {
                    const total = (data.inbox || []).reduce((sum, item) => sum + (item.unreadCount || 0), 0);
                    setUnreadChatCount(total);
                })
                .catch(() => { });
        }

        // Register with socket and listen for real-time notifications
        const socket = getSocket();
        if (user?._id) {
            socket.emit("register-user", String(user._id));
        }
        const handleNew = () => setUnreadCount((n) => n + 1);
        const handleNewChat = ({ message }) => {
            if (String(message?.senderId?._id || message?.senderId) !== String(user?._id)) {
                setUnreadChatCount((n) => n + 1);
            }
        };
        socket.on("notification:new", handleNew);
        socket.on("chat:new-message", handleNewChat);
        return () => {
            socket.off("notification:new", handleNew);
            socket.off("chat:new-message", handleNewChat);
        };
    }, [user?._id, role]);

    useEffect(() => {
        setMenuOpen(false);
        // Reset chat badge when visiting the chat page
        if (location.pathname.includes("/chat")) {
            setUnreadChatCount(0);
        }
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const navItems = navConfig[role] || navConfig.STUDENT;
    const bellPath = notificationsPath[role];
    const utilities = utilityLinks[role] || [];
    const activeItem = navItems.find((item) => {
        if (matchesPath(location.pathname, item.to)) return true;
        return item.matchPaths?.some((p) => matchesPath(location.pathname, p));
    }) || navItems[0];

    // Route-specific header overrides
    const headerOverrides = (() => {
        if (/\/student\/bookings\/[^/]+\/pay/.test(location.pathname))
            return { label: "Booking Payment", hint: "Complete your accommodation booking payment." };
        if (location.pathname === "/student/payments")
            return { label: "Payment Dashboard", hint: "Review your booking payments, rent billing, and housing status." };
        if (location.pathname === "/student/tickets")
            return { label: "Maintenance Tickets", hint: "Report issues and track maintenance requests for your accommodation." };
        if (location.pathname === "/landlord/listings/create")
            return { label: "New Property Listing", hint: "Create and publish a new property listing." };
        if (location.pathname === "/landlord/bookings")
            return { label: "Bookings", hint: "Manage requests, approvals, and tenant stays." };
        return null;
    })();
    const headerLabel = headerOverrides?.label || activeItem?.label;
    const headerHint = headerOverrides?.hint || activeItem?.hint;

    return (
        <div className="min-h-screen bg-transparent">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
                <div className="absolute right-[-8rem] top-20 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
                <div className="absolute bottom-[-10rem] left-1/3 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />
            </div>

            <div className="lg:hidden">
                <div className="sticky top-0 z-40 border-b border-white/70 bg-white/90 px-4 py-3 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <BrandLogo compact />
                            <div className="min-w-0">
                                <div className="truncate text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                                    {roleLabel[role] || "Portal"}
                                </div>
                                <div className="truncate text-sm font-semibold text-slate-900">
                                    {headerLabel}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {bellPath && (
                                <Link
                                    to={bellPath}
                                    className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                    <Bell size={18} strokeWidth={2.2} />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                                            {unreadCount > 99 ? "99+" : unreadCount}
                                        </span>
                                    )}
                                </Link>
                            )}
                            <button
                                onClick={handleLogout}
                                title="Logout"
                                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                            >
                                <LogOut size={18} strokeWidth={2.2} />
                            </button>
                            <button
                                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
                                onClick={() => setMenuOpen(true)}
                            >
                                <Menu size={18} strokeWidth={2.2} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {menuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
                    onClick={() => setMenuOpen(false)}
                />
            )}

            <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[290px_1fr]">
                <aside
                    className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col transform border-r border-white/10 bg-slate-950/96 px-5 py-6 text-white backdrop-blur-xl transition duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
                >
                    <div className="mb-6 flex items-start justify-between gap-3">
                        <BrandLogo to="/" variant="sidebar" />
                        <button
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 text-slate-300 lg:hidden"
                            onClick={() => setMenuOpen(false)}
                        >
                            <X size={18} strokeWidth={2.2} />
                        </button>
                    </div>

                    <div className="mt-4 flex-1 overflow-y-auto pr-1">
                        <div className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                            Navigation
                        </div>
                        <nav className="space-y-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive
                                                ? "bg-white text-slate-950 shadow-lg shadow-slate-950/10"
                                                : "text-slate-300 hover:bg-white/10 hover:text-white"
                                            }`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <div
                                                    className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${isActive
                                                        ? "bg-slate-950 text-white"
                                                        : "bg-white/[0.08] text-slate-300 group-hover:bg-white/[0.14] group-hover:text-white"
                                                        }`}
                                                >
                                                    <Icon size={18} strokeWidth={2.2} />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate font-semibold">{item.label}</div>
                                                    <div className={`truncate text-xs ${isActive ? "text-slate-500" : "text-slate-400"}`}>
                                                        {item.hint}
                                                    </div>
                                                </div>

                                                {item.label === "Notifications" && unreadCount > 0 && (
                                                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                                                        {unreadCount > 99 ? "99+" : unreadCount}
                                                    </span>
                                                )}
                                                {item.label === "Chat" && unreadChatCount > 0 && (
                                                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                                                        {unreadChatCount > 99 ? "99+" : unreadChatCount}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </nav>


                    </div>
                </aside>

                <div className="min-w-0">
                    <div className="hidden px-6 pt-6 lg:block">
                        <div className="card px-6 py-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                                        {roleLabel[role] || "Portal"}
                                    </div>
                                    <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                                        {headerLabel}
                                    </h1>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                        {headerHint}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-right shadow-sm">
                                        <div className="text-sm font-semibold text-slate-900">
                                            {user?.fullName}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {user?.email}
                                        </div>
                                    </div>

                                    {showRating && userRating && userRating.reviewCount > 0 && (
                                        <div className="flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 shadow-sm">
                                            <Star size={16} className="fill-amber-400 text-amber-400" />
                                            <span className="text-sm font-bold text-slate-800">{userRating.averageRating.toFixed(1)}</span>
                                            <span className="text-xs text-slate-500">({userRating.reviewCount})</span>
                                        </div>
                                    )}

                                    {bellPath ? (
                                        <Link
                                            to={bellPath}
                                            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white"
                                        >
                                            <Bell size={18} strokeWidth={2.2} />
                                            {unreadCount > 0 ? (
                                                <span className="absolute -top-1 -right-1 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                                                    {unreadCount > 99 ? "99+" : unreadCount}
                                                </span>
                                            ) : null}
                                        </Link>
                                    ) : null}

                                    <button
                                        onClick={handleLogout}
                                        title="Logout"
                                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                                    >
                                        <LogOut size={18} strokeWidth={2.2} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}
