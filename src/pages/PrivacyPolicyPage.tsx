/**
 * Privacy Policy page — legally required for SaaS operation in India.
 * Configurable branding via SaaS context.
 */

import { Link } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';

export default function PrivacyPolicyPage() {
  const { config } = useSaaS();
  const brand = config?.branding?.brand_name || 'Instagram E-commerce Agent';
  const company = 'Neirotech AI Private Limited';
  const email = 'privacy@chatslytics.com';
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
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: {updated}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-100">1. Who We Are</h2>
            <p>{brand} is operated by {company}, registered in Noida, India. We provide AI-powered Instagram Direct Message automation for businesses.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">2. Information We Collect</h2>
            <p><strong>Account Information:</strong> Name, email address, and password when you sign up.</p>
            <p><strong>Instagram Data:</strong> When you connect your Instagram Business account, we access your Instagram messages, comments, follower data, and business account information via the Instagram API, solely to provide the DM automation service.</p>
            <p><strong>Payment Information:</strong> Payment details are processed by Razorpay. We do not store your card or bank details.</p>
            <p><strong>Usage Data:</strong> We collect analytics on how you use the dashboard (pages visited, features used) to improve the product.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide and operate the AI DM automation service</li>
              <li>Respond to your customers' Instagram messages on your behalf</li>
              <li>Generate analytics and lead scoring from your conversations</li>
              <li>Send you product updates and support communications</li>
              <li>Process payments and manage your subscription</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">4. Data Storage & Security</h2>
            <p>Your data is stored on secure cloud servers (Microsoft Azure, Mumbai region). We use encryption for sensitive data including Instagram access tokens. We do not sell, rent, or share your personal data with third parties except as required to provide the service (e.g., payment processing via Razorpay).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">5. Instagram Data Usage</h2>
            <p>We access your Instagram data only through official Meta/Instagram APIs. We use Instagram CDN URLs for media — we do not download or re-host your Instagram media files. Your Instagram credentials are encrypted and stored separately from your account data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">6. Data Retention & Deletion</h2>
            <p>We retain your data for as long as your account is active. You can request deletion of your account and all associated data at any time from your Account Settings page or by emailing {email}. Upon deletion, all your data including conversation history, products, and analytics will be permanently removed within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">7. Your Rights</h2>
            <p>Under the Digital Personal Data Protection Act, 2023 (India), you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">8. Cookies</h2>
            <p>We use essential cookies for authentication (Supabase session). We do not use tracking cookies or third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">9. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you of significant changes via email or in-app notification.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">10. Contact Us</h2>
            <p>For privacy-related inquiries: <a href={`mailto:${email}`} className="text-blue-400 hover:underline">{email}</a></p>
            <p>{company}, Noida, Uttar Pradesh, India</p>
          </section>
        </div>
      </div>
    </div>
  );
}
