export default function LoadingState({
    title = "Loading UniLife Hub",
    description = "Please wait while we prepare your workspace.",
    compact = false,
}) {
    return (
        <div className={`card flex flex-col items-center justify-center text-center ${compact ? "px-6 py-8" : "px-8 py-12 sm:px-10"}`}>
            <span className="loading-orbit" aria-hidden="true" />
            <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
        </div>
    );
}