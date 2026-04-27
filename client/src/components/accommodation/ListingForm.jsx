import {
  CalendarDays,
  Camera,
  CheckCircle2,
  CreditCard,
  FileText,
  House,
  Image,
  MapPin,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const initialForm = {
  title: "",
  description: "",
  addressLine: "",
  city: "",
  area: "",
  rent: "",
  keyMoney: "",
  billsIncluded: false,
  roomType: "SINGLE",
  genderPreference: "ANY",
  maxOccupants: 1,
  availableFrom: "",
  facilitiesText: "",
  photosText: "",
};

const roomTypeOptions = [
  { value: "SINGLE", label: "Single" },
  { value: "SHARED", label: "Shared" },
  { value: "ANNEX", label: "Annex" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "HOUSE", label: "House" },
];

const genderOptions = [
  { value: "ANY", label: "Any" },
  { value: "MALE_ONLY", label: "Male only" },
  { value: "FEMALE_ONLY", label: "Female only" },
];

function formatCurrency(amount) {
  return `LKR ${Number(amount || 0).toLocaleString()}`;
}

function splitCommaValues(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const facilityAliases = {
  "wifi": "WiFi", "wi-fi": "WiFi", "wi fi": "WiFi",
  "a/c": "A/C", "ac": "A/C", "air con": "A/C", "air conditioning": "A/C",
  "roof top": "Rooftop", "bath room": "Bathroom", "car park": "Parking",
};

function normalizeFacility(name) {
  const trimmed = name.trim();
  const key = trimmed.toLowerCase();
  if (facilityAliases[key]) return facilityAliases[key];
  return trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
}

function validateForm(form) {
  const errors = {};
  const title = form.title.trim();
  const description = form.description.trim();
  const rent = Number(form.rent);
  const keyMoney = form.keyMoney === "" ? 0 : Number(form.keyMoney);
  const maxOccupants = Number(form.maxOccupants);
  const facilities = splitCommaValues(form.facilitiesText);

  if (title.length < 5 || title.length > 120) {
    errors.title = "Title must be between 5 and 120 characters.";
  }

  if (description.length < 20 || description.length > 2000) {
    errors.description = "Description must be between 20 and 2000 characters.";
  }

  if (!form.addressLine.trim()) {
    errors.addressLine = "Address line is required.";
  }

  if (!form.city.trim()) {
    errors.city = "City is required.";
  }

  if (!form.area.trim()) {
    errors.area = "Area is required.";
  }

  if (!form.rent || Number.isNaN(rent) || rent <= 0) {
    errors.rent = "Rent must be greater than 0.";
  }

  if (Number.isNaN(keyMoney) || keyMoney < 0) {
    errors.keyMoney = "Key money must be 0 or more.";
  } else if (!errors.rent && keyMoney > 0 && keyMoney <= rent) {
    errors.keyMoney = "Key money must be greater than monthly rent when it is used.";
  }

  if (!Number.isInteger(maxOccupants) || maxOccupants < 1 || maxOccupants > 20) {
    errors.maxOccupants = "Max occupants must be between 1 and 20.";
  }

  if (!form.availableFrom) {
    errors.availableFrom = "Available from date is required.";
  }

  if (facilities.length < 3) {
    errors.facilitiesText = "Add at least 3 facilities, separated by commas.";
  }

  return errors;
}

function FieldMessage({ message }) {
  if (!message) return null;

  return <p className="mt-2 text-xs font-medium text-rose-600">{message}</p>;
}

/* ── Section wrapper ── */
function FormSection({ icon: Icon, number, title, subtitle, completed, children }) {
  return (
    <div className={`rounded-[26px] border bg-gradient-to-b from-white to-slate-50/60 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors sm:p-6 ${completed ? "border-emerald-200/80" : "border-slate-200/80"}`}>
      <div className="mb-5 flex items-start gap-3.5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${completed ? "bg-emerald-50 text-emerald-600 ring-emerald-200/60" : "bg-slate-100 text-slate-500 ring-slate-200/60"}`}>
          {completed ? <CheckCircle2 size={16} strokeWidth={2.2} /> : <Icon size={16} strokeWidth={2.2} />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Step {number}
            </span>
            {completed && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 ring-1 ring-emerald-200/60">
                <CheckCircle2 size={9} strokeWidth={2.5} />
                Done
              </span>
            )}
          </div>
          <h4 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">{title}</h4>
          <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function ListingForm({
  initialValues = null,
  onSubmit,
  submitting = false,
  submitLabel = "Save listing",
}) {
  const defaults = useMemo(() => {
    if (!initialValues) return initialForm;

    return {
      title: initialValues.title || "",
      description: initialValues.description || "",
      addressLine: initialValues.location?.addressLine || "",
      city: initialValues.location?.city || "",
      area: initialValues.location?.area || "",
      rent: initialValues.rent || "",
      keyMoney: initialValues.keyMoney || "",
      billsIncluded: initialValues.billsIncluded || false,
      roomType: initialValues.roomType || "SINGLE",
      genderPreference: initialValues.genderPreference || "ANY",
      maxOccupants: initialValues.maxOccupants || 1,
      availableFrom: initialValues.availableFrom
        ? new Date(initialValues.availableFrom).toISOString().split("T")[0]
        : "",
      facilitiesText: Array.isArray(initialValues.facilities)
        ? initialValues.facilities.join(", ")
        : "",
      photosText: Array.isArray(initialValues.photos)
        ? initialValues.photos.join(", ")
        : "",
    };
  }, [initialValues]);

  const [form, setForm] = useState(defaults);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(defaults);
    setErrors({});
  }, [defaults]);

  const facilities = useMemo(() => {
    const raw = splitCommaValues(form.facilitiesText);
    const seen = new Set();
    return raw.reduce((acc, item) => {
      const normalized = normalizeFacility(item);
      const key = normalized.toLowerCase();
      if (!seen.has(key)) { seen.add(key); acc.push(normalized); }
      return acc;
    }, []);
  }, [form.facilitiesText]);
  const photoList = useMemo(() => splitCommaValues(form.photosText), [form.photosText]);
  const rentAmount = Number(form.rent) || 0;
  const keyMoneyAmount = Number(form.keyMoney) || 0;
  const firstPaymentAmount = keyMoneyAmount > 0 ? keyMoneyAmount : rentAmount;

  /* ── Completion progress ── */
  const completionItems = useMemo(() => [
    { label: "Title", done: form.title.trim().length >= 5 },
    { label: "Description", done: form.description.trim().length >= 20 },
    { label: "Address", done: !!form.addressLine.trim() },
    { label: "City & Area", done: !!form.city.trim() && !!form.area.trim() },
    { label: "Rent", done: Number(form.rent) > 0 },
    { label: "Availability", done: !!form.availableFrom },
    { label: "Facilities", done: facilities.length >= 3 },
    { label: "Photos", done: photoList.length > 0, optional: true },
  ], [form, facilities, photoList]);

  const requiredItems = completionItems.filter((i) => !i.optional);
  const requiredDone = requiredItems.filter((i) => i.done).length;
  const requiredTotal = requiredItems.length;
  const completionPercent = Math.round((requiredDone / requiredTotal) * 100);
  const isReady = requiredDone === requiredTotal;

  const sectionComplete = useMemo(() => ({
    1: form.title.trim().length >= 5 && form.description.trim().length >= 20,
    2: !!form.addressLine.trim() && !!form.city.trim() && !!form.area.trim() && !!form.availableFrom,
    3: Number(form.rent) > 0,
    4: facilities.length >= 3,
  }), [form, facilities]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));

    setErrors((prev) => {
      if (!prev[key] && !(key === "rent" && prev.keyMoney) && !(key === "facilitiesText" && prev.facilitiesText)) {
        return prev;
      }

      const next = { ...prev };
      delete next[key];

      if (key === "rent") {
        delete next.keyMoney;
      }

      return next;
    });
  };

  const removeFacility = (facilityToRemove) => {
    const updated = facilities.filter((f) => f !== facilityToRemove);
    handleChange("facilitiesText", updated.join(", "));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const nextErrors = validateForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    onSubmit?.({
      title: form.title,
      description: form.description,
      location: {
        addressLine: form.addressLine,
        city: form.city,
        area: form.area,
      },
      rent: Number(form.rent),
      keyMoney: form.keyMoney ? Number(form.keyMoney) : 0,
      billsIncluded: !!form.billsIncluded,
      roomType: form.roomType,
      genderPreference: form.genderPreference,
      maxOccupants: Number(form.maxOccupants),
      availableFrom: form.availableFrom,
      facilities,
      photos: photoList,
    });
  };

  return (
    <div className="space-y-5">
      {/* ── Readiness strip ── */}
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isReady ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100" : "bg-amber-50 text-amber-600 ring-1 ring-amber-100"}`}>
              {isReady ? <CheckCircle2 size={17} strokeWidth={2.2} /> : <Rocket size={17} strokeWidth={2.2} />}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {isReady ? "Ready to publish" : "Complete your listing"}
              </div>
              <div className="text-xs text-slate-500">
                {requiredDone} of {requiredTotal} required fields done
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:min-w-[200px]">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${isReady ? "bg-emerald-500" : "bg-amber-500"}`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className={`text-xs font-bold tabular-nums ${isReady ? "text-emerald-600" : "text-amber-600"}`}>
              {completionPercent}%
            </span>
          </div>
        </div>

        {/* Completion pills */}
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-6">
          {completionItems.map((item) => (
            <span
              key={item.label}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${item.done
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                : "bg-slate-100 text-slate-400"
                }`}
            >
              {item.done && <CheckCircle2 size={10} strokeWidth={2.5} />}
              {item.label}{item.optional && <span className="ml-0.5 font-normal text-slate-400">(opt)</span>}
            </span>
          ))}
        </div>
      </div>

      {/* ── Live summary strip ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: CreditCard,
            label: "First Payment",
            value: firstPaymentAmount > 0 ? formatCurrency(firstPaymentAmount) : "Not set",
            sub: keyMoneyAmount > 0 ? "Key money" : "First month rent",
            color: "text-indigo-600 bg-indigo-50 ring-indigo-100",
          },
          {
            icon: Users,
            label: "Capacity",
            value: form.maxOccupants || 0,
            sub: "Maximum occupants",
            color: "text-blue-600 bg-blue-50 ring-blue-100",
          },
          {
            icon: Sparkles,
            label: "Facilities",
            value: facilities.length,
            sub: facilities.length >= 3 ? "Requirement met" : facilities.length === 0 ? "Add at least 3" : `${3 - facilities.length} more needed`,
            color: "text-emerald-600 bg-emerald-50 ring-emerald-100",
          },
          {
            icon: CalendarDays,
            label: "Move-in Date",
            value: form.availableFrom || "Not set",
            sub: "Available from",
            color: "text-amber-600 bg-amber-50 ring-amber-100",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${card.color}`}>
                <card.icon size={13} strokeWidth={2.2} />
              </div>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">{card.label}</span>
            </div>
            <div className="mt-2.5 text-lg font-black tracking-tight text-slate-900">{card.value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Form ── */}
      <form className="space-y-5" onSubmit={handleSubmit}>
        {/* Section 1 — Property overview */}
        <FormSection
          icon={FileText}
          number="1"
          title="Property overview"
          subtitle="Start with the headline students see when browsing listings."
          completed={sectionComplete[1]}
        >
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Title <span className="text-rose-400">*</span>
              </label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Comfortable shared room near campus"
                required
              />
              <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>Keep it specific and easy to scan.</span>
                <span className={`tabular-nums ${form.title.trim().length > 115 ? "font-semibold text-rose-500" : form.title.trim().length > 100 ? "font-medium text-amber-500" : ""}`}>{form.title.trim().length}/120</span>
              </div>
              <FieldMessage message={errors.title} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows="5"
                className="input min-h-[140px] resize-y"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Describe the room, safety, nearby places, house rules, and key facilities..."
                required
              />
              <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>Students care about location, safety, and day-to-day comfort.</span>
                <span className={`tabular-nums ${form.description.trim().length > 1950 ? "font-semibold text-rose-500" : form.description.trim().length > 1800 ? "font-medium text-amber-500" : ""}`}>{form.description.trim().length}/2000</span>
              </div>
              <FieldMessage message={errors.description} />
            </div>
          </div>
        </FormSection>

        {/* Section 2 — Location & availability */}
        <FormSection
          icon={MapPin}
          number="2"
          title="Location and availability"
          subtitle="Accurate details reduce booking friction and build student confidence."
          completed={sectionComplete[2]}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Address line <span className="text-rose-400">*</span>
              </label>
              <input
                className="input"
                value={form.addressLine}
                onChange={(e) => handleChange("addressLine", e.target.value)}
                placeholder="123 Main Street"
                required
              />
              <FieldMessage message={errors.addressLine} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                City <span className="text-rose-400">*</span>
              </label>
              <input
                className="input"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Colombo"
                required
              />
              <FieldMessage message={errors.city} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Area <span className="text-rose-400">*</span>
              </label>
              <input
                className="input"
                value={form.area}
                onChange={(e) => handleChange("area", e.target.value)}
                placeholder="Malabe"
                required
              />
              <FieldMessage message={errors.area} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Available from <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                className="input"
                value={form.availableFrom}
                onChange={(e) => handleChange("availableFrom", e.target.value)}
                required
              />
              <FieldMessage message={errors.availableFrom} />
            </div>

            <div className="flex items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-start gap-2.5">
                <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" strokeWidth={2.2} />
                <p className="text-[13px] leading-relaxed text-slate-500">
                  Students compare city, area, and move-in date before looking deeper at facilities.
                </p>
              </div>
            </div>
          </div>
        </FormSection>

        {/* Section 3 — Pricing & occupancy */}
        <FormSection
          icon={CreditCard}
          number="3"
          title="Pricing and occupancy"
          subtitle="These fields affect the booking amount and how the listing appears to students."
          completed={sectionComplete[3]}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Monthly rent <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                className="input"
                value={form.rent}
                onChange={(e) => handleChange("rent", e.target.value)}
                placeholder="18000"
                required
              />
              <FieldMessage message={errors.rent} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Key money <span className="text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.keyMoney}
                onChange={(e) => handleChange("keyMoney", e.target.value)}
                placeholder="Leave blank if no key money"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                If used, key money must be greater than monthly rent.
              </p>
              <FieldMessage message={errors.keyMoney} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Room type</label>
              <select
                className="select"
                value={form.roomType}
                onChange={(e) => handleChange("roomType", e.target.value)}
              >
                {roomTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Gender preference</label>
              <select
                className="select"
                value={form.genderPreference}
                onChange={(e) => handleChange("genderPreference", e.target.value)}
              >
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Max occupants <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="20"
                className="input"
                value={form.maxOccupants}
                onChange={(e) => handleChange("maxOccupants", e.target.value)}
                required
              />
              <FieldMessage message={errors.maxOccupants} />
            </div>

            {/* Pricing preview */}
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                <House size={13} strokeWidth={2.2} />
                Pricing preview
              </div>
              <div className="mt-2.5 space-y-1 text-sm text-slate-600">
                <div>
                  Monthly rent:{" "}
                  <span className="font-semibold text-slate-900">
                    {rentAmount > 0 ? formatCurrency(rentAmount) : "Not set"}
                  </span>
                </div>
                <div>
                  Key money:{" "}
                  <span className="font-semibold text-slate-900">
                    {keyMoneyAmount > 0 ? formatCurrency(keyMoneyAmount) : "None"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bills included toggle */}
            <div className="md:col-span-2">
              <label
                htmlFor="billsIncluded"
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:bg-slate-50"
              >
                <div className="relative">
                  <input
                    id="billsIncluded"
                    type="checkbox"
                    checked={form.billsIncluded}
                    onChange={(e) => handleChange("billsIncluded", e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-300 peer-focus-visible:ring-offset-2" />
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-700">Bills included in rent</span>
                  <span className="ml-2 text-xs text-slate-400">Water, electricity, and utilities</span>
                </div>
              </label>
            </div>
          </div>
        </FormSection>

        {/* Section 4 — Amenities & media */}
        <FormSection
          icon={Camera}
          number="4"
          title="Amenities and media"
          subtitle="Strong amenities and photos make your listing stand out to students."
          completed={sectionComplete[4]}
        >
          <div className="space-y-6">
            {/* Facilities */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Facilities <span className="text-rose-400">*</span>
              </label>
              <input
                className="input"
                value={form.facilitiesText}
                onChange={(e) => handleChange("facilitiesText", e.target.value)}
                placeholder="WiFi, Water, Study Table, Attached Bathroom"
                required
              />
              <p className="mt-1.5 text-xs text-slate-400">
                {facilities.length >= 3
                  ? `${facilities.length} facilities added — you're all set.`
                  : "Separate with commas. Minimum 3 required."}
              </p>
              <FieldMessage message={errors.facilitiesText} />

              {/* Facility tags */}
              {facilities.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/40 px-3.5 py-2.5">
                  {facilities.slice(0, 10).map((facility) => (
                    <span
                      key={facility}
                      className="group inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100/60 transition-colors hover:bg-indigo-100/80"
                    >
                      <Sparkles size={10} strokeWidth={2.5} />
                      {facility}
                      <button
                        type="button"
                        onClick={() => removeFacility(facility)}
                        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-indigo-400 transition-colors hover:bg-indigo-200 hover:text-indigo-700"
                        aria-label={`Remove ${facility}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {facilities.length > 10 && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      +{facilities.length - 10} more
                    </span>
                  )}
                  <span className="ml-auto text-[11px] font-semibold tabular-nums text-slate-400">
                    {facilities.length}{facilities.length >= 3 ? " ✓" : " / 3 min"}
                  </span>
                </div>
              )}
            </div>

            {/* Photos */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Photos <span className="text-xs font-normal text-slate-400">(optional)</span>
              </label>

              {/* Gallery-style frame */}
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-4">
                <div className="flex items-center gap-3 text-slate-400">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white">
                    <Image size={20} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-600">
                      {photoList.length > 0
                        ? `${photoList.length} photo${photoList.length === 1 ? "" : "s"} added`
                        : "No photos yet"}
                    </div>
                    <div className="text-xs text-slate-400">
                      Add image links, separated by commas
                    </div>
                  </div>
                </div>

                {/* Photo thumbnails preview */}
                {photoList.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {photoList.slice(0, 4).map((url, i) => (
                      <div key={i} className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <Image size={14} className="text-slate-300" />
                        <img
                          src={url}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      </div>
                    ))}
                    {photoList.length > 4 && (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500">
                        +{photoList.length - 4}
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  rows="3"
                  className="input mt-3 min-h-[90px] resize-y"
                  value={form.photosText}
                  onChange={(e) => handleChange("photosText", e.target.value)}
                  placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Photos help students feel confident about booking your place.
              </p>
            </div>
          </div>
        </FormSection>

        {/* ── Action zone ── */}
        <div className={`rounded-[26px] border bg-gradient-to-r p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all sm:p-6 ${isReady ? "border-emerald-200 from-emerald-50/40 to-white shadow-emerald-100/40" : "border-slate-200/80 from-slate-50 to-white"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${isReady ? "bg-emerald-50 text-emerald-600 ring-emerald-200/60" : "bg-slate-100 text-slate-400 ring-slate-200/60"}`}>
                {isReady ? <CheckCircle2 size={17} strokeWidth={2.2} /> : <Rocket size={17} strokeWidth={2.2} />}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {isReady ? "Ready to publish!" : "Complete all required fields"}
                </div>
                <div className="text-xs text-slate-500">
                  {isReady
                    ? "Hit publish and students can find your listing instantly."
                    : `${requiredTotal - requiredDone} required field${requiredTotal - requiredDone === 1 ? "" : "s"} remaining`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary gap-2 px-6 py-2.5 text-sm shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
                disabled={submitting}
              >
                <Rocket size={15} strokeWidth={2.2} />
                {submitting ? "Publishing..." : submitLabel}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}