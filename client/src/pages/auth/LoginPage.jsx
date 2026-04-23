import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import authHero from "../../assets/illustrations/auth-hero.png";
import fullLogo from "../../assets/branding/logo-full.png";

export default function LoginPage() {
  const { login, user, routeByRole } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(routeByRole(user.role), { replace: true });
  }, [user, navigate, routeByRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const loggedUser = await login(form);
      toast.success("Login successful");
      navigate(routeByRole(loggedUser.role), { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="card hidden overflow-hidden p-10 lg:block">
  <div className="mb-6">
    <img
      src={fullLogo}
      alt="UniLife Hub"
      className="h-20 md:h-24 object-contain"
    />
  </div>

  <h1 className="max-w-xl text-5xl font-black leading-tight text-slate-900">
    Smart accommodation management for modern university life.
  </h1>

  <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
    Browse listings, request bookings, pay rent, track maintenance, chat with
    landlords, and stay informed from one elegant platform.
  </p>

  <div className="mt-8 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 p-6">
    <img
      src={authHero}
      alt="Student accommodation illustration"
      className="mx-auto max-h-[320px] w-full object-contain"
    />
  </div>

  <div className="mt-8 grid gap-4 md:grid-cols-2">
    {[
      "Beautiful student dashboards",
      "Separate landlord workspace",
      "Live chat and notifications",
      "Booking, payment, and ticket flows",
    ].map((text) => (
      <div key={text} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
        <div className="text-sm font-semibold text-slate-800">{text}</div>
      </div>
    ))}
  </div>
</section>

        <section className="card p-8 sm:p-10">
          <div className="mb-8">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">
              Welcome back
            </div>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">
                Login as a student, landlord, or vendor to continue.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                className="input"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don’t have an account?{" "}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Create one
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}