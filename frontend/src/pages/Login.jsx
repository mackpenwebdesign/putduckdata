import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  EnvelopeSimple,
  LockSimple,
  Eye,
  EyeSlash,
  ArrowRight,
  ShieldCheck,
  Timer,
  Users,
  Sparkle,
} from "@phosphor-icons/react";
// Sparkle kept in import for desktop brand panel use
import { toast } from "react-hot-toast";
import useAuthStore from "../stores/authStore";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const redirectTo = searchParams.get("redirect");

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email address";
    if (!formData.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await login(formData.email, formData.password);
      toast.success("Welcome back!");
      navigate(redirectTo || "/dashboard");
    } catch (error) {
      toast.error(
        error.error ||
          error.message ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Timer className="w-5 h-5 text-white" weight="fill" />,
      title: "Fast Delivery",
      sub: "Data delivered in 0–5 minutes",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-white" weight="fill" />,
      title: "Secure Payments",
      sub: "Bank-level encryption via Paystack",
    },
    {
      icon: <Users className="w-5 h-5 text-white" weight="fill" />,
      title: "24/7 Support",
      sub: "Always here when you need us",
    },
  ];

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* ── Left brand panel (lg+) ── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[44%] relative overflow-hidden flex-col items-center justify-center p-14 flex-shrink-0">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(0,0,0,0.3) 0%, transparent 50%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-32 w-[500px] h-[500px] bg-black/20 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-sm w-full">
          {/* Logo */}
          <div className="mb-10 text-center">
            <img
              src="/logo/logo.png"
              alt="PutDuckData"
              className="h-36 mx-auto drop-shadow-2xl mb-5"
            />
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-3">
              <Sparkle className="w-3.5 h-3.5 text-white" weight="fill" />
              <span className="text-white text-xs font-semibold tracking-wide">
                Ghana's #1 Data Platform
              </span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Fast, affordable data bundles for MTN, Telecel & AirtelTigo
            </p>
          </div>

          {/* Feature cards */}
          <div className="space-y-3">
            {features.map(({ icon, title, sub }) => (
              <div
                key={title}
                className="flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-4 hover:bg-white/15 transition-colors"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-white/55 text-xs mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom tag */}
          <p className="text-white/30 text-xs text-center mt-10">
            Trusted by thousands of Ghanaians
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary-800/6 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md px-5 sm:px-8 py-8 relative z-10">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/">
              <img
                src="/logo/logo.png"
                alt="PutDuckData"
                className="h-32 mx-auto drop-shadow-xl"
              />
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-7 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
              Welcome back
            </h1>
            <p className="text-dark-400 text-sm">
              Sign in to your PutDuckData account
            </p>
          </div>

          {/* Form card */}
          <div className="bg-dark-900/60 backdrop-blur-sm border border-dark-800 rounded-2xl p-6 sm:p-7 shadow-xl shadow-black/20">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <EnvelopeSimple className="w-5 h-5 text-dark-500" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="kofi@example.com"
                    autoComplete="email"
                    className={`w-full bg-dark-800/80 border ${
                      errors.email
                        ? "border-red-500/60 focus:ring-red-500/30"
                        : "border-dark-700 focus:ring-primary-600/30 focus:border-primary-600/60"
                    } rounded-xl pl-11 pr-4 py-3.5 text-white text-sm placeholder-dark-600 focus:outline-none focus:ring-2 transition-all`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    ⚠ {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-dark-300">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary-500 hover:text-primary-400 transition-colors font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockSimple className="w-5 h-5 text-dark-500" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`w-full bg-dark-800/80 border ${
                      errors.password
                        ? "border-red-500/60 focus:ring-red-500/30"
                        : "border-dark-700 focus:ring-primary-600/30 focus:border-primary-600/60"
                    } rounded-xl pl-11 pr-12 py-3.5 text-white text-sm placeholder-dark-600 focus:outline-none focus:ring-2 transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-dark-500 hover:text-dark-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlash className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    ⚠ {errors.password}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-500 active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-primary-900/40 hover:shadow-xl hover:shadow-primary-800/40 transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" weight="bold" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer links */}
          <div className="mt-5 text-center space-y-3">
            {/* 
            <p className="text-dark-500 text-sm">
              Want to sell data?{" "}
              <Link
                to="/register"
                className="text-primary-500 hover:text-primary-400 font-semibold transition-colors"
              >
                Become a Partner
              </Link>
            </p>
          */}
            <Link
              to="/"
              className="text-xs text-dark-600 hover:text-dark-400 transition-colors inline-flex items-center gap-1"
            >
              ← Back to Home
            </Link>
            <p className="text-dark-700 text-[11px]">
              &copy; {new Date().getFullYear()} PutDuckData
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
