import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PageHero from "./common/PageHero";
import EmptyState from "./common/EmptyState";

export default function TransportManagerVerificationGuard({ children }) {
    const { user, logout, refreshUser } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    if (user.transportManagerVerificationStatus === "VERIFIED") {
        return children;
    }

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const handleRefresh = async () => {
        const updatedUser = await refreshUser();
        if (updatedUser?.transportManagerVerificationStatus === "VERIFIED") {
            window.location.reload();
        }
    };

    const state =
        user.transportManagerVerificationStatus === "REJECTED"
            ? {
                title: "Transport Manager account rejected",
                description:
                    "Your transport manager account has been reviewed and rejected. Please contact the admin or submit a new request if needed.",
                icon: "❌",
            }
            : {
                title: "Transport Manager approval pending",
                description:
                    "Your transport manager account has been created, but you must wait for admin verification before accessing the transport portal.",
                icon: "⏳",
            };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-4xl space-y-6 pt-10">
                <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                        Logged in as: <strong>{user.fullName}</strong>
                    </div>
                    <button onClick={handleLogout} className="btn-secondary">
                        Logout
                    </button>
                </div>

                <PageHero
                    eyebrow="Transport Portal"
                    title="Approval Required"
                    description="Transport manager access is restricted until admin verification is completed."
                />

                <EmptyState
                    icon={state.icon}
                    title={state.title}
                    description={state.description}
                />

                <div className="card p-6">
                    <h3 className="text-lg font-bold text-slate-900">What can you do?</h3>
                    <div className="mt-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">✓</span>
                            <div>
                                <div className="font-semibold text-slate-900">Check your status</div>
                                <div className="text-sm text-slate-600">
                                    Click the button below to check if your account has been approved.
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-xl">✓</span>
                            <div>
                                <div className="font-semibold text-slate-900">Wait for admin approval</div>
                                <div className="text-sm text-slate-600">
                                    An administrator will review your transport manager registration and approve it soon.
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-xl">✓</span>
                            <div>
                                <div className="font-semibold text-slate-900">Logout and come back later</div>
                                <div className="text-sm text-slate-600">
                                    You can safely logout and login again once you receive approval notification.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button onClick={handleRefresh} className="btn-primary">
                            🔄 Check Approval Status
                        </button>
                        <button onClick={handleLogout} className="btn-secondary">
                            Logout
                        </button>
                    </div>
                </div>

                <div className="card border-l-4 border-indigo-500 bg-indigo-50 p-5">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">ℹ️</span>
                        <div>
                            <h4 className="font-bold text-indigo-900">Need help?</h4>
                            <p className="mt-1 text-sm leading-6 text-indigo-800">
                                If you believe your account should be verified or if you have questions
                                about the verification process, please contact the platform administrator.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
