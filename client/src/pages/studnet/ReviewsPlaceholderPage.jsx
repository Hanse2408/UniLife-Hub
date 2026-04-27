import PageHero from "../../components/common/PageHero";
import EmptyState from "../../components/common/EmptyState";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";

export default function ReviewsPlaceholderPage() {
    return (
        <div className="space-y-6">
            <PageHero
                eyebrow="Student Portal"
                title="Reviews & Ratings"
                description="This tab is reserved for cross-module reviews and ratings."
                backgroundImage={dashboardBanner}
            />

            <EmptyState
                icon="⭐"
                title="Reviews module placeholder"
                description="This area can later combine accommodation, food, and transport reviews contributed by students."
            />
        </div>
    );
}
