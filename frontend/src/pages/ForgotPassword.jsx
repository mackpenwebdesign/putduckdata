import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import Input from "../components/Input";
import Button from "../components/Button";
import api from "../utils/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      await api.post("/password-forgot", { email });
      setSubmitted(true);
    } catch (error) {
      toast.error(
        error.error || error.message || "Failed to process request. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-white mb-2">
            Forgot Password
          </h1>
          <p className="text-dark-400">
            {submitted
              ? "Check your email for reset instructions"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {/* Form */}
        <div className="bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-8 shadow-xl">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Email Sent</h3>
              <p className="text-dark-400 text-sm mb-6">
                If an account exists with{" "}
                <span className="text-white font-medium">{email}</span>, you
                will receive password reset instructions shortly.
              </p>
              <p className="text-dark-500 text-xs mb-6">
                Didn't receive an email? Check your spam folder or try again.
              </p>
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                className="border-dark-700 hover:border-primary-600"
              >
                Try Another Email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                icon={Mail}
                autoComplete="email"
                required
              />

              <Button
                type="submit"
                fullWidth
                loading={loading}
                className="shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30 transition-all duration-300"
              >
                Send Reset Link
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

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-sm text-dark-400 hover:text-primary-600 transition-colors inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
