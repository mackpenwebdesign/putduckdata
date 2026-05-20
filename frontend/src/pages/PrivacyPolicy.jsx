import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Database,
  Mail,
  Phone,
} from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="border-b border-dark-800/50 bg-dark-950/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            to="/"
            className="inline-flex items-center text-dark-400 hover:text-primary-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-primary-600/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
              <p className="text-dark-400 text-sm mt-1">
                Last updated: January 2026
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-dark-900/50 border border-dark-800 rounded-2xl p-8 md:p-12 space-y-8">
          {/* Introduction */}
          <section>
            <p className="text-dark-300 leading-relaxed">
              At PutDuckData, we take your privacy seriously. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your
              information when you use our platform. Please read this privacy
              policy carefully. If you do not agree with the terms of this
              privacy policy, please do not access the platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center space-x-3 mb-4">
              <Database className="w-5 h-5 text-primary-600" />
              <h2 className="text-2xl font-bold text-white">
                Information We Collect
              </h2>
            </div>
            <div className="space-y-4 text-dark-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Personal Information
                </h3>
                <p className="leading-relaxed">
                  We collect personal information that you voluntarily provide
                  to us when you register on the platform, including:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Full name</li>
                  <li>Email address</li>
                  <li>Phone number (for transactions)</li>
                  <li>Country of residence</li>
                  <li>Payment information (processed securely via Paystack)</li>
                  <li>Wallet transaction history</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Transaction Information
                </h3>
                <p className="leading-relaxed">
                  We collect information about your transactions, including:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Data bundle purchases</li>
                  <li>Wallet funding history</li>
                  <li>Payment history</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Usage Data
                </h3>
                <p className="leading-relaxed">
                  We automatically collect certain information when you visit,
                  use, or navigate the platform:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>IP address</li>
                  <li>Browser type and version</li>
                  <li>Device information</li>
                  <li>Pages visited and time spent</li>
                  <li>Referring website</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <div className="flex items-center space-x-3 mb-4">
              <Eye className="w-5 h-5 text-primary-600" />
              <h2 className="text-2xl font-bold text-white">
                How We Use Your Information
              </h2>
            </div>
            <div className="text-dark-300 space-y-3">
              <p className="leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Create and manage your account</li>
                <li>Process your data bundle purchases</li>
                <li>Process wallet funding and transactions</li>
                <li>Improve our services and user experience</li>
                <li>Send you transaction confirmations and receipts</li>
                <li>Provide customer support</li>
                <li>Detect and prevent fraud</li>
                <li>Comply with legal obligations</li>
                <li>Send promotional communications (with your consent)</li>
                <li>Improve our platform and services</li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <div className="flex items-center space-x-3 mb-4">
              <Lock className="w-5 h-5 text-primary-600" />
              <h2 className="text-2xl font-bold text-white">Data Security</h2>
            </div>
            <div className="text-dark-300 space-y-3">
              <p className="leading-relaxed">
                We implement industry-standard security measures to protect your
                personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>SSL/TLS encryption for all data transmission</li>
                <li>
                  Bcrypt password hashing (never storing plain text passwords)
                </li>
                <li>JWT token-based authentication with token blacklisting</li>
                <li>Regular security audits and monitoring</li>
                <li>Secure payment processing via Paystack</li>
                <li>Rate limiting to prevent brute force attacks</li>
                <li>Account lockout after failed login attempts</li>
              </ul>
              <p className="leading-relaxed mt-4">
                However, no method of transmission over the Internet or
                electronic storage is 100% secure. While we strive to use
                commercially acceptable means to protect your personal
                information, we cannot guarantee its absolute security.
              </p>
            </div>
          </section>

          {/* Information Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Information Sharing and Disclosure
            </h2>
            <div className="text-dark-300 space-y-3">
              <p className="leading-relaxed">
                We do not sell, trade, or rent your personal information to
                third parties. We may share your information in the following
                circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">Service Providers:</strong>{" "}
                  With Paystack for payment processing and mobile network
                  operators for data delivery
                </li>
                <li>
                  <strong className="text-white">Legal Requirements:</strong>{" "}
                  When required by law or to respond to legal process
                </li>
                <li>
                  <strong className="text-white">Business Transfers:</strong> In
                  connection with a merger, sale, or acquisition
                </li>
                <li>
                  <strong className="text-white">With Your Consent:</strong>{" "}
                  When you explicitly authorize us to share your information
                </li>
              </ul>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Your Privacy Rights
            </h2>
            <div className="text-dark-300 space-y-3">
              <p className="leading-relaxed">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access your personal information</li>
                <li>Update or correct your information</li>
                <li>Delete your account and data</li>
                <li>Object to processing of your information</li>
                <li>Export your data in a portable format</li>
                <li>Opt-out of marketing communications</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p className="leading-relaxed mt-4">
                To exercise these rights, please contact us at{" "}
                <a
                  href="mailto:support@putduckdata.com"
                  className="text-primary-600 hover:text-primary-500"
                >
                  support@putduckdata.com
                </a>
              </p>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Data Retention
            </h2>
            <p className="text-dark-300 leading-relaxed">
              We retain your personal information for as long as necessary to
              provide our services and comply with legal obligations. When you
              delete your account, we will delete or anonymize your personal
              information within 30 days, except where we are required to retain
              it for legal, tax, or regulatory purposes.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Cookies and Tracking
            </h2>
            <p className="text-dark-300 leading-relaxed">
              We use cookies and similar tracking technologies to track activity
              on our platform and store certain information. You can instruct
              your browser to refuse all cookies or to indicate when a cookie is
              being sent. However, if you do not accept cookies, you may not be
              able to use some portions of our platform.
            </p>
          </section>

          {/* Third-Party Links */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Third-Party Links
            </h2>
            <p className="text-dark-300 leading-relaxed">
              Our platform may contain links to third-party websites. We are not
              responsible for the privacy practices of these websites. We
              encourage you to read the privacy policies of any third-party
              sites you visit.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Children's Privacy
            </h2>
            <p className="text-dark-300 leading-relaxed">
              Our platform is not intended for individuals under the age of 18.
              We do not knowingly collect personal information from children. If
              you believe we have collected information from a child, please
              contact us immediately.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Changes to This Privacy Policy
            </h2>
            <p className="text-dark-300 leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify
              you of any changes by posting the new Privacy Policy on this page
              and updating the "Last updated" date. You are advised to review
              this Privacy Policy periodically for any changes.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-dark-800/50 border border-dark-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
            <p className="text-dark-300 leading-relaxed mb-4">
              If you have any questions about this Privacy Policy, please
              contact us:
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-primary-600" />
                <a
                  href="mailto:support@putduckdata.com"
                  className="text-primary-600 hover:text-primary-500"
                >
                  support@putduckdata.com
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-primary-600" />
                <a
                  href="tel:0322291381"
                  className="text-primary-600 hover:text-primary-500"
                >
                  0322291381
                </a>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                </div>
                <span className="text-dark-300">Accra, Ghana</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
