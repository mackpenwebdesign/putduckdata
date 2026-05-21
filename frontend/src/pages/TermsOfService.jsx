import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, FileText, ChevronDown, ChevronUp } from "lucide-react";

const ScrollArrow = () => {
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      setAtBottom(scrollTop + windowHeight >= docHeight - 100);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    if (atBottom) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg shadow-primary-600/30 flex items-center justify-center transition-all hover:scale-110"
      aria-label={atBottom ? "Scroll to top" : "Scroll to bottom"}
    >
      {atBottom ? (
        <ChevronUp className="w-5 h-5" />
      ) : (
        <ChevronDown className="w-5 h-5" />
      )}
    </button>
  );
};

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-dark-950">
      <ScrollArrow />
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
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Terms of Service
              </h1>
              <p className="text-dark-400 text-sm mt-1">
                Last updated: January 2026
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-dark-900/50 border border-dark-800 rounded-2xl p-5 sm:p-8 md:p-12 space-y-6 sm:space-y-8">
          {/* Introduction */}
          <section>
            <p className="text-dark-300 leading-relaxed">
              Welcome to PutDuckData. These Terms of Service ("Terms") govern
              your access to and use of our platform, services, and features. By
              accessing or using PutDuckData, you agree to be bound by these
              Terms. If you disagree with any part of these Terms, you may not
              access our platform.
            </p>
          </section>

          {/* Acceptance */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              1. Acceptance of Terms
            </h2>
            <div className="text-dark-300 space-y-3">
              <p className="leading-relaxed">
                By creating an account and using PutDuckData, you acknowledge
                that you have read, understood, and agree to be bound by these
                Terms and our Privacy Policy. These Terms apply to all users,
                including customers and administrators.
              </p>
              <p className="leading-relaxed">
                By using PutDuckData, you represent that you are a valid SIM
                card holder on any supported network. There is no age
                restriction to use this platform, however minors should have
                parental or guardian consent before creating an account.
              </p>
            </div>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              2. Account Registration and Security
            </h2>
            <div className="text-dark-300 space-y-3">
              <h3 className="text-lg font-semibold text-white">
                2.1 Account Creation
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  You must provide accurate, current, and complete information
                  during registration
                </li>
                <li>
                  You are responsible for maintaining the confidentiality of
                  your account credentials
                </li>
                <li>
                  You must notify us immediately of any unauthorized access to
                  your account
                </li>
                <li>
                  You are responsible for all activities that occur under your
                  account
                </li>
                <li>One person or entity may only create one account</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">
                2.2 Account Security
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use a strong, unique password for your account</li>
                <li>Do not share your password with anyone</li>
                <li>Enable two-factor authentication when available</li>
                <li>Log out from your account at the end of each session</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">
                2.3 Account Termination
              </h3>
              <p className="leading-relaxed">
                We reserve the right to suspend or terminate your account at any
                time for violations of these Terms, fraudulent activity, or any
                other reason we deem necessary to protect the platform and other
                users.
              </p>
            </div>
          </section>

          {/* Services */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              3. Platform Services
            </h2>
            <div className="text-dark-300 space-y-3">
              <h3 className="text-lg font-semibold text-white">
                3.1 Data Bundle Purchases
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  We offer data bundles for MTN, Vodafone, and AirtelTigo
                  networks in Ghana
                </li>
                <li>Prices are displayed in Ghana Cedis (GH₵)</li>
                <li>
                  Data delivery is typically fast but may take up to 5 minutes
                </li>
                <li>
                  You must ensure the phone number provided is correct before
                  purchase
                </li>
                <li>
                  Refunds are only provided for failed transactions where data
                  was not delivered
                </li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">
                3.2 Wallet Services
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Fund your wallet via Paystack (credit/debit cards, mobile
                  money) for fast credit
                </li>
                <li>
                  Alternatively, fund via bank transfer for fast admin approval
                </li>
                <li>Wallet balance can be used to purchase data bundles</li>
                <li>
                  Wallet balance is non-transferable and non-refundable except
                  as required by law
                </li>
                <li>Minimum wallet funding amount is GH₵10</li>
              </ul>
            </div>
          </section>

          {/* Payment Terms */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              4. Payment and Refund Policy
            </h2>
            <div className="text-dark-300 space-y-3">
              <h3 className="text-lg font-semibold text-white">4.1 Payments</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All payments are processed securely via Paystack</li>
                <li>We accept credit cards, debit cards, and mobile money</li>
                <li>Payment confirmation is sent via email</li>
                <li>Failed payments will not deduct money from your account</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">
                4.2 Refunds
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Refunds are only issued for failed data deliveries</li>
                <li>
                  Refund requests must be submitted within 24 hours of
                  transaction
                </li>
                <li>
                  Refunds are processed to your wallet balance, not original
                  payment method
                </li>
                <li>Processing time for refunds is 1-3 business days</li>
                <li>
                  No refunds for successful data deliveries or user error (wrong
                  number)
                </li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-4">
                4.3 Pricing
              </h3>
              <p className="leading-relaxed">
                We reserve the right to modify pricing at any time. Price
                changes will not affect purchases already made. Current prices
                are displayed on the platform at the time of purchase.
              </p>
            </div>
          </section>

          {/* Prohibited Activities */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              5. Prohibited Activities
            </h2>
            <div className="text-dark-300 space-y-3">
              <p className="leading-relaxed">You agree NOT to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the platform for any illegal purposes</li>
                <li>
                  Attempt to gain unauthorized access to any part of the
                  platform
                </li>
                <li>
                  Use bots, scripts, or automated tools to access the platform
                </li>
                <li>Create multiple accounts to abuse promotions</li>
                <li>
                  Reverse engineer, decompile, or disassemble any part of the
                  platform
                </li>
                <li>Interfere with or disrupt the platform's functionality</li>
                <li>
                  Use the platform to transmit viruses, malware, or harmful code
                </li>
                <li>Harass, abuse, or harm other users</li>
                <li>Impersonate any person or entity</li>
                <li>Sell, transfer, or assign your account to another party</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Violation of these prohibitions may result in immediate account
                termination and legal action.
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              6. Intellectual Property Rights
            </h2>
            <div className="text-dark-300 space-y-3">
              <p className="leading-relaxed">
                All content on PutDuckData, including but not limited to text,
                graphics, logos, images, software, and design, is the property
                of PutDuckData or its licensors and is protected by copyright,
                trademark, and other intellectual property laws.
              </p>
              <p className="leading-relaxed">
                You may not copy, modify, distribute, sell, or lease any part of
                our platform or included software without our express written
                permission.
              </p>
            </div>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              7. Disclaimers and Limitations
            </h2>
            <div className="text-dark-300 space-y-3">
              <h3 className="text-lg font-semibold text-white">
                7.1 Service Availability
              </h3>
              <p className="leading-relaxed">
                We strive to provide uninterrupted service but do not guarantee
                that the platform will be available at all times. We may suspend
                or discontinue any part of the platform at any time without
                notice.
              </p>

              <h3 className="text-lg font-semibold text-white mt-4">
                7.2 Third-Party Services
              </h3>
              <p className="leading-relaxed">
                Data delivery depends on mobile network operators (MTN,
                Vodafone, AirtelTigo). We are not responsible for delays or
                failures caused by these third-party providers.
              </p>

              <h3 className="text-lg font-semibold text-white mt-4">
                7.3 Limitation of Liability
              </h3>
              <p className="leading-relaxed">
                PutDuckData shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages resulting from your
                use of or inability to use the platform. Our total liability
                shall not exceed the amount you paid to us in the past 12
                months.
              </p>
            </div>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              8. Indemnification
            </h2>
            <p className="text-dark-300 leading-relaxed">
              You agree to indemnify and hold harmless PutDuckData, its
              officers, directors, employees, and agents from any claims,
              damages, losses, liabilities, and expenses (including legal fees)
              arising from your use of the platform or violation of these Terms.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              9. Changes to Terms
            </h2>
            <p className="text-dark-300 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will
              notify users of material changes via email or platform
              notification. Your continued use of the platform after changes
              constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              10. Governing Law and Dispute Resolution
            </h2>
            <div className="text-dark-300 space-y-3">
              <p className="leading-relaxed">
                These Terms shall be governed by and construed in accordance
                with the laws of Ghana. Any disputes arising from these Terms or
                your use of the platform shall be resolved through arbitration
                in Accra, Ghana.
              </p>
              <p className="leading-relaxed">
                You agree to first attempt to resolve any dispute informally by
                contacting us at support@putduckdata.com before initiating any
                formal proceedings.
              </p>
            </div>
          </section>

          {/* Severability */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              11. Severability
            </h2>
            <p className="text-dark-300 leading-relaxed">
              If any provision of these Terms is found to be unenforceable or
              invalid, that provision will be limited or eliminated to the
              minimum extent necessary, and the remaining provisions will remain
              in full force and effect.
            </p>
          </section>

          {/* Entire Agreement */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              12. Entire Agreement
            </h2>
            <p className="text-dark-300 leading-relaxed">
              These Terms, together with our Privacy Policy, constitute the
              entire agreement between you and PutDuckData regarding your use of
              the platform and supersede all prior agreements and
              understandings.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-dark-800/50 border border-dark-700 rounded-xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              Contact Us
            </h2>
            <p className="text-dark-300 leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please
              contact us:
            </p>
            <div className="space-y-2">
              <p className="text-dark-300">
                Email:{" "}
                <a
                  href="mailto:support@putduckdata.com"
                  className="text-primary-600 hover:text-primary-500"
                >
                  support@putduckdata.com
                </a>
              </p>
              <p className="text-dark-300">
                Tel:{" "}
                <a
                  href="tel:0558638899"
                  className="text-primary-600 hover:text-primary-500"
                >
                  0558638899
                </a>
              </p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="border-t border-dark-800 pt-6">
            <p className="text-dark-400 text-sm leading-relaxed">
              By using PutDuckData, you acknowledge that you have read these
              Terms of Service and agree to be bound by them.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
