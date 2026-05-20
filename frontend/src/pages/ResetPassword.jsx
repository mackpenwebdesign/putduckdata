import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import Input from "../components/Input";
import Button from "../components/Button";
import api from "../utils/api";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    new_password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.new_password) {
      newErrors.new_password = "Password is required";
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.new_password)) {
      newErrors.new_password =
        "Must contain uppercase, lowercase, and a number";
    }

    if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      await api.post("/password-reset", {
        token,
        new_password: formData.new_password,
      });
      setSuccess(true);
      toast.success("Password reset successfully!");
    } catch (error) {
      toast.error(
        error.error ||
          error.message ||
          "Failed to reset password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <Link to="/">
            <img
              src="/logo/logo.png"
              alt="PutDuckData"
              className="h-20 mx-auto mb-6"
            />
          </Link>
          <div className="bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-8 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-3">
              Invalid Reset Link
            </h2>
            <p className="text-dark-400 text-sm mb-6">
              This password reset link is invalid or has expired. Please request
              a new one.
            </p>
            <Link to="/forgot-password">
              <Button fullWidth>Request New Reset Link</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <img
              src="/logo/logo.png"
              alt="PutDuckData"
              className="h-20 mx-auto mb-4 hover:scale-105 transition-transform duration-300"
            />
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-dark-400">
            {success
              ? "Your password has been reset"
              : "Enter your new password below"}
          </p>
        </div>

        {/* Form */}
        <div className="bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-8 shadow-xl">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Password Updated
              </h3>
              <p className="text-dark-400 text-sm mb-6">
                Your password has been reset successfully. You can now sign in
                with your new password.
              </p>
              <Button
                fullWidth
                onClick={() => navigate("/login")}
                className="shadow-lg shadow-primary-600/20"
              >
                Sign In Now
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="New Password"
                type="password"
                name="new_password"
                value={formData.new_password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                icon={Lock}
                error={errors.new_password}
                autoComplete="new-password"
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Re-enter new password"
                icon={Lock}
                error={errors.confirm_password}
                autoComplete="new-password"
                required
              />

              <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
                <p className="text-dark-400 text-xs">
                  <strong className="text-dark-300">
                    Password requirements:
                  </strong>
                  <br />
                  - At least 8 characters
                  <br />
                  - One uppercase letter
                  <br />
                  - One lowercase letter
                  <br />- One number
                </p>
              </div>

              <Button
                type="submit"
                fullWidth
                loading={loading}
                className="shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30 transition-all duration-300"
              >
                Reset Password
              </Button>
            </form>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-primary-600 hover:text-primary-500 transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
