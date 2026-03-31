/**
 * Terms of Service page — legally required for SaaS operation.
 * Configurable branding via SaaS context.
 */

import { Link } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';

export default function TermsOfServicePage() {
  const { config } = useSaaS();
  const brand = config?.branding?.brand_name || 'Instagram E-commerce Agent';
  const company = 'Neirotech AI Private Limited';
  const email = 'support@chatslytics.com';
  const updated = 'March 22, 2026';

  return (
    <div className="min-h-screen" style={{ background: '#070B14', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <Link to="/" className="font-semibold text-[17px] text-slate-200">{brand}</Link>
          <Link to="/" className="text-sm text-slate-400 hover:text-slate-200">Back to home</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: {updated}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-100">1. Acceptance of Terms</h2>
            <p>By creating an account or using {brand}, you agree to these Terms of Service. If you do not agree, please do not use the service. {brand} is operated by {company}.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">2. Service Description</h2>
            <p>{brand} provides AI-powered automation for Instagram Direct Messages. The service includes automated DM responses, lead scoring, CRM, analytics, and follow-up scheduling. The service requires you to connect your Instagram Business or Creator account via Instagram's official OAuth flow.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">3. Account Registration</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use this service. One person or business may maintain only one account.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">4. Trial Period</h2>
            <p>New users receive a 14-day trial period with access to features included in their selected plan. A ₹1 verification charge is collected at sign-up and refunded within 5–7 business days. At the end of the trial period, access to the dashboard and AI agent will be paused until you subscribe to a paid plan. Your data is preserved for 90 days after trial expiry.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">5. Subscription & Payments</h2>
            <p>Paid subscriptions are billed monthly via Razorpay. All prices are in Indian Rupees (INR) and are inclusive of applicable taxes. You may cancel your subscription at any time from your Account Settings. Upon cancellation, your access continues until the end of the current billing period.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">6. Refund Policy</h2>
            <p>We offer a full refund within 7 days of your first paid subscription if you are not satisfied. After 7 days, refunds are not available for the current billing period. Contact {email} for refund requests.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">7. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the service to send spam or unsolicited messages</li>
              <li>Violate Instagram's Terms of Service or Community Guidelines</li>
              <li>Use the service for illegal activities</li>
              <li>Attempt to reverse-engineer or circumvent the service</li>
              <li>Share your account credentials with others</li>
              <li>Use the service to sell prohibited items (weapons, drugs, counterfeit goods)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">8. AI-Generated Content</h2>
            <p>The AI agent generates responses on your behalf. While we employ quality gates and brand protection measures, you are ultimately responsible for all messages sent from your Instagram account through our service. We recommend reviewing AI responses regularly and adjusting settings as needed.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">9. Service Availability</h2>
            <p>We strive for 99.9% uptime but do not guarantee uninterrupted service. The service depends on third-party platforms (Instagram API, Meta) which may experience outages beyond our control. We will notify you of planned maintenance in advance.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">10. Data & Privacy</h2>
            <p>Your use of the service is also governed by our <Link to="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>. We take data security seriously and comply with the Digital Personal Data Protection Act, 2023 (India).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">11. Limitation of Liability</h2>
            <p>{company} shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service, including but not limited to lost sales, lost data, or business interruption. Our total liability is limited to the amount you paid for the service in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">12. Termination</h2>
            <p>We may suspend or terminate your account if you violate these terms. You may delete your account at any time from Account Settings. Upon termination, your data will be deleted within 30 days as described in our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">13. Governing Law</h2>
            <p>These terms are governed by the laws of India. Any disputes shall be resolved in the courts of Noida, Uttar Pradesh, India.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">14. Contact</h2>
            <p>For questions about these terms: <a href={`mailto:${email}`} className="text-blue-400 hover:underline">{email}</a></p>
            <p>{company}, Noida, Uttar Pradesh, India</p>
          </section>
        </div>
      </div>
    </div>
  );
}
