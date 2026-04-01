import {
  Globe,
  Lightbulb,
  Rocket,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createListingApi } from "../../api/client";
import ListingForm from "../../components/accommodation/ListingForm";


export default function CreateListingPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true);
      await createListingApi(payload);
      toast.success("Listing published successfully!");
      navigate("/landlord/listings");
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || "Failed to publish listing");
    } finally {
      setSubmitting(false);
    }
  };

  
  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <section className="card overflow-hidden">
        <div className="relative px-6 py-6 sm:px-8 sm:py-8 lg:px-10">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-800" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.15),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(56,189,248,0.1),transparent_40%)]" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75 backdrop-blur-sm">
                <Sparkles size={12} strokeWidth={2.2} />
                New Listing
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-300 backdrop-blur-sm">
                <Globe size={12} strokeWidth={2.2} />
                Direct publishing
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Build a listing students will love
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Fill in your property details and publish instantly — students can discover and book it as soon as it goes live.
            </p>
          </div>
        </div>
      </section>

      {/* ── Main layout ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Form */}
        <ListingForm
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel="Publish Listing"
        />

        {/* ── Sidebar ── */}
        <div className="space-y-5">
          {/* Quick publish guide */}
          <div className="card p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <Rocket size={16} strokeWidth={2.2} />
              </div>
              <h4 className="text-[14px] font-bold text-slate-900">Quick publish guide</h4>
            </div>
            <div className="mt-3 space-y-2">
              {[
                { step: "1", text: "Fill in property details", color: "bg-indigo-50 text-indigo-600" },
                { step: "2", text: "Add photos and amenities", color: "bg-amber-50 text-amber-600" },
                { step: "3", text: "Publish — live instantly", color: "bg-emerald-50 text-emerald-600" },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${item.color}`}>
                    {item.step}
                  </span>
                  <span className="text-[13px] text-slate-600">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optimization tips */}
          <div className="card p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <TrendingUp size={16} strokeWidth={2.2} />
              </div>
              <h4 className="text-[14px] font-bold text-slate-900">Optimization tips</h4>
            </div>
            <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-3.5 py-2">Use a specific, scannable title.</div>
              <div className="rounded-2xl bg-slate-50 px-3.5 py-2">Include 3+ facilities for easy comparison.</div>
              <div className="rounded-2xl bg-slate-50 px-3.5 py-2">Add photos — they drive significantly more views.</div>
              <div className="rounded-2xl bg-slate-50 px-3.5 py-2">Be transparent on rent and key money.</div>
            </div>
          </div>

          {/* What students check first */}
          <div className="card p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                <Lightbulb size={16} strokeWidth={2.2} />
              </div>
              <h4 className="text-[14px] font-bold text-slate-900">What students check first</h4>
            </div>
            <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-slate-600">
              <div className="rounded-2xl bg-amber-50/60 px-3.5 py-2">
                <span className="font-semibold text-amber-700">Price</span> — rent, key money, bills included.
              </div>
              <div className="rounded-2xl bg-amber-50/60 px-3.5 py-2">
                <span className="font-semibold text-amber-700">Fit</span> — room type, occupancy, gender.
              </div>
              <div className="rounded-2xl bg-amber-50/60 px-3.5 py-2">
                <span className="font-semibold text-amber-700">Trust</span> — location, photos, facilities.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}