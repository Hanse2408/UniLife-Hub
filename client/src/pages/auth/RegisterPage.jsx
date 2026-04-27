import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import authHero from "../../assets/illustrations/auth-hero.png";
import fullLogo from "../../assets/branding/logo-full.png";

export default function RegisterPage() {
  const { register, user, routeByRole } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "STUDENT",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(routeByRole(user.role), { replace: true });
  }, [user, navigate, routeByRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const registeredUser = await register(form);
      toast.success(
        registeredUser.role === "LANDLORD" || registeredUser.role === "VENDOR" || registeredUser.role === "TRANSPORT_MANAGER"
          ? "Account created. Wait for admin verification."
          : "Account created successfully"
      );
      navigate(routeByRole(registeredUser.role), { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-3xl p-8 sm:p-10">
        <div className="mb-6">
          <img
            src={fullLogo}
            alt="UniLife Hub"
            className="h-20 md:h-24 object-contain"
          />
        </div>

        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <img
            src={authHero}
            alt="Student accommodation illustration"
            className="mx-auto max-h-[220px] w-full object-contain"
          />
        </div>

        <div className="mb-8">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">
            Join UniLife Hub
          </div>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Create account</h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign up as a student, landlord, vendor, or transport manager. Landlords, vendors, and transport managers require admin verification.
          </p>
        </div>

        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Full name</label>
            <input
              className="input"
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="Narada Weera"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="0771234567"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
            <select
              className="select"
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="STUDENT">Student</option>
              <option value="LANDLORD">Landlord</option>
              <option value="VENDOR">Vendor</option>
              <option value="TRANSPORT_MANAGER">Transport Manager</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}