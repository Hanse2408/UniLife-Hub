import PageHero from "../../components/common/PageHero";
import EmptyState from "../../components/common/EmptyState";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

export default function TransportPlaceholderPage() {
    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Student Portal"
                title="Transport"
                description="This tab is reserved for the transport module in your group project."
                backgroundImage={dashboardBanner}
            />

            <EmptyState
                icon="🚌"
                title="Transport module placeholder"
                description="This page can later connect to your group member's transport planning, shuttle, and trip-booking features."
            />
        </div>
    );
}
