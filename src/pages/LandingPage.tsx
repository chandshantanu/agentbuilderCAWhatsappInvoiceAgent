/**
 * CA Invoice Agent — Premium SaaS landing page.
 * Config-driven: branding, features, pricing, testimonials all from SaaSContext.
 *
 * Design direction: "Precision Ledger" — dark navy with warm amber/gold accents,
 * sophisticated typography, CA-specific content defaults.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import {
  ArrowRight,
  Check,
  Shield,
  Zap,
  BarChart3,
  FileText,
  Users,
  Clock,
  Sparkles,
  Star,
  MessageSquare,
  Database,
  Receipt,
  ScanLine,
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────── */

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/** Lighten a hex color toward white */
function lightenColor(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/* ─── Animation config ────────────────────────────── */

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease } },
};

/* ─── Icon map for features ───────────────────────── */

const FEATURE_ICONS = [MessageSquare, Database, Receipt, Shield, BarChart3, ScanLine];

/* ─── Default SaaS images (Azure CDN) ────────────── */

const CDN_BASE = 'https://stagentbuilderwidgets.blob.core.windows.net/widgets/saas-images';
const CA_CDN = `${CDN_BASE}/ca`;

const DEFAULT_IMAGES = {
  hero: `${CA_CDN}/hero.jpg`,
  features: [
    `${CA_CDN}/feature-whatsapp.jpg`,
    `${CA_CDN}/feature-clients.jpg`,
    `${CA_CDN}/feature-tally.jpg`,
    `${CA_CDN}/feature-gst.jpg`,
    `${CA_CDN}/feature-analytics.jpg`,
    `${CA_CDN}/feature-ocr.jpg`,
  ],
  humanEntrepreneur: `${CA_CDN}/social-proof.jpg`,
  humanTeam: `${CA_CDN}/team-banner.jpg`,
};

/* ─── CA-specific default content ────────────────── */

const CA_DEFAULTS = {
  hero_title: 'Your Clients Send Bills on WhatsApp. You Get Tally-Ready Vouchers.',
  hero_subtitle: 'AI-powered invoice processing for Chartered Accountants. WhatsApp photos become GST-compliant Tally XML exports — automatically.',
  hero_badges: ['GST Compliant', 'Tally Integration', 'WhatsApp Native'],
  cta_text: 'Start Free Trial',
  features: [
    {
      title: 'WhatsApp Invoice Capture',
      description: 'Clients simply photograph and send invoices on WhatsApp. No app downloads, no portals — just the messaging app they already use.',
    },
    {
      title: 'Smart Client Management',
      description: 'Link phone numbers to client accounts. Bills from multiple branches auto-route to the right client. Unlimited clients, zero confusion.',
    },
    {
      title: 'One-Click Tally XML Export',
      description: 'Export verified invoices directly as Tally Prime XML. Correct GST ledgers, voucher types, and bill-wise allocations — ready to import.',
    },
    {
      title: 'Automated GST Computation',
      description: 'CGST, SGST, IGST, and cess computed automatically per line item. Supply type (intra/inter-state) detected from GSTIN. Zero manual entry.',
    },
    {
      title: 'Invoice Analytics Dashboard',
      description: 'Track pending reviews, approval rates, and monthly volumes at a glance. Filter by client, date range, or status in seconds.',
    },
    {
      title: 'AI Document Extraction',
      description: 'Advanced OCR reads printed and handwritten bills. HSN/SAC codes, quantities, rates — all extracted with confidence scoring.',
    },
  ],
  pricing_features: [
    'Unlimited WhatsApp invoice capture',
    'Unlimited client accounts',
    'One-click Tally Prime XML export',
    'Automated GST computation (CGST/SGST/IGST)',
    'Invoice analytics dashboard',
    'AI-powered OCR extraction',
    'Bulk approve & export',
    'WhatsApp delivery notifications',
  ],
  social_proof_title: 'Trusted by Chartered Accountants across India',
  social_proof_description: 'CAs reduce manual data entry by 90% and close their books faster every month. Your clients love it too — no new app to learn.',
  social_proof_count: '200+',
  social_proof_stats: [
    { value: '90%', label: 'Less data entry' },
    { value: '<2 min', label: 'Per invoice' },
    { value: '100%', label: 'GST accurate' },
  ],
  cta_section_title: 'Ready to eliminate manual invoice entry?',
  cta_section_subtitle: 'Set up in under 10 minutes. Your first 14 days are completely free.',
};

/* ─── Hero Atmosphere (bezier curves + orbs) ──────── */

function HeroAtmosphere({ rgb }: { rgb: string }) {
  const prefersReduced = useReducedMotion();
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* SVG bezier decoration */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 720"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="curve-grad-a" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={`rgba(${rgb}, 0.18)`} />
            <stop offset="100%" stopColor={`rgba(${rgb}, 0)`} />
          </linearGradient>
          <linearGradient id="curve-grad-b" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={`rgba(${rgb}, 0.1)`} />
            <stop offset="100%" stopColor={`rgba(${rgb}, 0)`} />
          </linearGradient>
        </defs>
        {/* Filled gradient shape — upper right */}
        <path
          d="M600 0 C700 200, 1000 350, 1200 180 S1440 0, 1440 80 L1440 0 Z"
          fill="url(#curve-grad-a)"
        />
        {/* Filled gradient shape — lower left */}
        <path
          d="M0 720 C200 520, 500 600, 720 480 S1000 350, 1440 550 L1440 720 Z"
          fill="url(#curve-grad-b)"
        />
        {/* Flowing line — primary */}
        <path
          d="M-80 580 C240 320, 520 120, 740 320 S1120 600, 1520 180"
          stroke={`rgba(${rgb}, 0.14)`}
          strokeWidth="2.5"
        />
        {/* Flowing line — secondary */}
        <path
          d="M-40 640 C300 400, 600 200, 800 370 S1200 540, 1520 260"
          stroke={`rgba(${rgb}, 0.07)`}
          strokeWidth="1.5"
        />
        {/* Thin accent line — top */}
        <path
          d="M0 80 C300 40, 700 180, 1000 60 S1300 120, 1440 40"
          stroke={`rgba(${rgb}, 0.09)`}
          strokeWidth="1"
        />
      </svg>

      {/* Animated glow orbs */}
      {!prefersReduced && (
        <>
          <motion.div
            animate={{ y: [0, -18, 0], x: [0, 8, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[8%] right-[12%] w-[340px] h-[340px] rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(${rgb}, 0.2) 0%, transparent 70%)`,
              filter: 'blur(60px)',
            }}
          />
          <motion.div
            animate={{ y: [0, 14, 0], x: [0, -8, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
            className="absolute bottom-[8%] left-[8%] w-[280px] h-[280px] rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(${rgb}, 0.14) 0%, transparent 70%)`,
              filter: 'blur(50px)',
            }}
          />
        </>
      )}

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
}

/* ─── Main Component ──────────────────────────────── */

export default function LandingPage() {
  const { config } = useSaaS();
  const { isAuthenticated } = useSupabaseAuth();
  const navigate = useNavigate();

  if (!config) return null;

  const { branding, landing_page, pricing } = config;
  const primary = branding.primary_color || '#1e6b4a';
  const rgb = hexToRgb(primary);
  const lightAccent = lightenColor(primary, 0.35);

  // Merge CA defaults with config-provided values
  const lp = { ...CA_DEFAULTS, ...landing_page };
  const features: Array<{ title: string; description: string }> = lp.features || CA_DEFAULTS.features;
  const currencySymbol = pricing.currency === 'INR' ? '\u20B9' : '$';
  const displayPrice = pricing.display_price || pricing.monthly_price;

  const handleCta = () => navigate(isAuthenticated ? '/checkout' : '/signup');

  // SEO meta tags
  const pageTitle = `${branding.brand_name || 'CA Invoice Assistant'} — WhatsApp Invoice Processing & Tally Export`;
  const pageDesc = lp.hero_subtitle || CA_DEFAULTS.hero_subtitle;

  useEffect(() => {
    document.title = pageTitle;
    const setMeta = (name: string, content: string, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', pageDesc);
    setMeta('keywords', 'CA invoice assistant, WhatsApp invoice, Tally Prime XML export, GST automation, chartered accountant software, invoice processing India');
    setMeta('robots', 'index, follow');
    setMeta('og:title', pageTitle, 'property');
    setMeta('og:description', pageDesc, 'property');
    setMeta('og:type', 'website', 'property');
    setMeta('og:image', DEFAULT_IMAGES.hero, 'property');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', pageTitle);
    setMeta('twitter:description', pageDesc);
    setMeta('twitter:image', DEFAULT_IMAGES.hero);
    // JSON-LD for LocalBusiness / SoftwareApplication
    const ldId = 'ld-json-ca';
    let ld = document.getElementById(ldId) as HTMLScriptElement | null;
    if (!ld) { ld = document.createElement('script'); ld.id = ldId; ld.type = 'application/ld+json'; document.head.appendChild(ld); }
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: branding.brand_name || 'CA Invoice Assistant',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'WhatsApp, Web',
      description: pageDesc,
      offers: { '@type': 'Offer', priceCurrency: pricing.currency || 'INR', price: String(displayPrice || 0) },
    });
  }, [pageTitle, pageDesc]);

  return (
    <div className="min-h-screen" style={{ background: '#070B14', fontFamily: "'Inter', system-ui, sans-serif", fontSize: '16px' }}>

      {/* ═══════════ FIXED HEADER ═══════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-8 w-auto" />
            )}
            <span className="font-semibold text-[17px] text-slate-200 tracking-[-0.01em]">
              {branding.brand_name || config.subdomain}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="h-9 px-5 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110"
                style={{ backgroundColor: primary }}
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="h-9 px-4 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                >
                  Log in
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="h-9 px-5 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110 hover:shadow-md"
                  style={{ backgroundColor: primary }}
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative pt-[100px] pb-24 sm:pt-[130px] sm:pb-36 overflow-hidden">
        {/* Dark background */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(168deg, #06090f 0%, #0b1221 35%, #101d35 65%, #0b1221 100%)' }}
        />
        <HeroAtmosphere rgb={rgb} />

        {/* Content — split layout: text left, image right */}
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — text content */}
            <motion.div initial="hidden" animate="show" variants={stagger}>

              {/* Trust pills */}
              <motion.div variants={fadeUp} className="flex items-center gap-3 sm:gap-5 mb-9 flex-wrap">
                {(lp.hero_badges || CA_DEFAULTS.hero_badges).map((label: string) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 text-[13px] font-medium tracking-wide text-white/80"
                  >
                    <span
                      className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `rgba(${rgb}, 0.25)`, border: `1px solid rgba(${rgb}, 0.4)` }}
                    >
                      <Check className="h-2.5 w-2.5" style={{ color: lightAccent }} />
                    </span>
                    {label}
                  </span>
                ))}
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={fadeUp}
                className="text-[2.4rem] sm:text-[3.2rem] lg:text-[3.6rem] font-extrabold text-white leading-[1.08] tracking-[-0.025em] mb-6"
              >
                {lp.hero_title}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                variants={fadeUp}
                className="text-[1.05rem] sm:text-lg text-gray-300 leading-relaxed max-w-xl mb-10"
              >
                {lp.hero_subtitle}
              </motion.p>

              {/* CTA buttons */}
              <motion.div variants={fadeUp} className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <button
                  onClick={handleCta}
                  className="group inline-flex items-center gap-2.5 h-[52px] px-8 rounded-xl text-white font-semibold text-[15px] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${primary}, ${lightenColor(primary, 0.12)})`,
                    boxShadow: `0 0 0 1px rgba(${rgb}, 0.3), 0 8px 32px rgba(${rgb}, 0.35), 0 2px 6px rgba(0,0,0,0.15)`,
                  }}
                >
                  {lp.cta_text || 'Start Your Free Trial'}
                  <ArrowRight className="w-[18px] h-[18px] transition-transform group-hover:translate-x-0.5" />
                </button>
                {!isAuthenticated && (
                  <button
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center gap-2 h-[52px] px-7 rounded-xl text-gray-300 font-medium text-[15px] border border-white/15 hover:border-white/30 hover:text-white hover:bg-white/5 transition-all duration-300"
                  >
                    Sign in
                  </button>
                )}
              </motion.div>
            </motion.div>

            {/* Right — hero image */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, ease, delay: 0.3 }}
              className="hidden lg:block"
            >
              <div
                className="relative rounded-2xl overflow-hidden shadow-2xl"
                style={{ boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 80px rgba(${rgb}, 0.15)` }}
              >
                <img
                  src={landing_page.hero_image || DEFAULT_IMAGES.hero}
                  alt="Chartered Accountant using WhatsApp invoice assistant"
                  className="w-full h-auto object-cover rounded-2xl"
                  loading="eager"
                />
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, rgba(${rgb}, 0.08) 0%, transparent 60%)`,
                    border: `1px solid rgba(${rgb}, 0.15)`,
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Wave transition → features */}
        <div className="absolute bottom-0 left-0 right-0 leading-[0]">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-12 sm:h-[72px]">
            <path d="M0 40 C360 75, 720 10, 1080 55 S1440 25, 1440 25 L1440 80 L0 80 Z" fill="#070B14" />
          </svg>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      {features.length > 0 ? (
        <section className="py-16 sm:py-20 px-5 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0 }}
              variants={stagger}
              className="text-center mb-12"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-1.5 mb-4">
                <Sparkles className="w-4 h-4" style={{ color: primary }} />
                <span
                  className="text-xs font-bold uppercase tracking-[0.15em]"
                  style={{ color: primary }}
                >
                  Features
                </span>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="text-3xl sm:text-[2.5rem] font-bold text-slate-100 tracking-[-0.02em]"
              >
                Everything a CA practice needs
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0 }}
              variants={stagger}
              className={`grid gap-5 ${features.length <= 4 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}
            >
              {features.map((f: any, i) => {
                const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                const featureImage = f.image || (landing_page.feature_images?.[i]) || DEFAULT_IMAGES.features[i % DEFAULT_IMAGES.features.length];
                return (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden transition-shadow duration-300 hover:bg-white/[0.08] cursor-default"
                  >
                    {/* Feature image */}
                    <div className="relative h-40 overflow-hidden bg-white/5">
                      <img
                        src={featureImage}
                        alt={f.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(to top, rgba(7,11,20,0.8) 0%, transparent 50%)` }}
                      />
                    </div>
                    <div className="p-6 sm:p-7">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `rgba(${rgb}, 0.08)` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: primary }} />
                        </div>
                        <h3 className="font-semibold text-slate-200 text-[15px]">{f.title}</h3>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      ) : null}

      {/* ═══════════ PRICING ═══════════ */}
      <section className="py-16 sm:py-20 px-5 sm:px-8">
        <div className="max-w-md mx-auto">
          {/* Section header — always visible (no animation gate for safety) */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 mb-4">
              <Star className="w-4 h-4" style={{ color: primary }} />
              <span
                className="text-xs font-bold uppercase tracking-[0.15em]"
                style={{ color: primary }}
              >
                Pricing
              </span>
            </div>
            <h2 className="text-3xl sm:text-[2.5rem] font-bold text-slate-100 tracking-[-0.02em]">
              Simple, transparent
            </h2>
          </div>

          {/* Pricing card — no whileInView to avoid invisible-card bug */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.15 }}
            className="relative rounded-2xl p-7 sm:p-8"
            style={{
              background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
              border: `1.5px solid rgba(${rgb}, 0.18)`,
              boxShadow: `0 1px 3px rgba(0,0,0,0.06), 0 12px 40px rgba(${rgb}, 0.08)`,
            }}
          >
            {/* Trial badge */}
            {pricing.trial_days > 0 && (
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 h-[26px] px-4 rounded-full text-xs font-semibold text-white flex items-center gap-1 shadow-md"
                style={{
                  backgroundColor: primary,
                  boxShadow: `0 2px 12px rgba(${rgb}, 0.4)`,
                }}
              >
                <Sparkles className="w-3 h-3" />
                {pricing.trial_days}-day free trial
              </div>
            )}

            {/* Price display */}
            <p className="text-slate-400 text-center text-sm mb-2 mt-2">Monthly subscription</p>
            <div className="flex items-baseline justify-center gap-1 mb-7">
              <span className="text-xl font-medium text-slate-400">{currencySymbol}</span>
              <span className="text-[3.5rem] font-extrabold text-slate-100 tracking-tight leading-none">
                {displayPrice}
              </span>
              <span className="text-slate-400 text-base font-medium">/mo</span>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 mb-6" />

            {/* Feature checklist */}
            <div className="space-y-3.5 mb-8">
              {(lp.pricing_features || features.slice(0, 5)).map(
                (item: any, i: number) => {
                  const label = typeof item === 'string' ? item : item.title || item.label;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `rgba(${rgb}, 0.1)` }}
                      >
                        <Check className="w-3 h-3" style={{ color: primary }} />
                      </div>
                      <span className="text-[14px] text-slate-300 leading-snug">{label}</span>
                    </div>
                  );
                },
              )}
            </div>

            {/* CTA */}
            <button
              onClick={handleCta}
              className="w-full h-12 rounded-xl text-white font-semibold text-[15px] transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.99]"
              style={{
                background: `linear-gradient(135deg, ${primary}, ${lightenColor(primary, 0.1)})`,
                boxShadow: `0 4px 16px rgba(${rgb}, 0.3)`,
              }}
            >
              {lp.cta_text || 'Get Started'}
            </button>

            <p className="text-xs text-slate-500 text-center mt-4 tracking-wide">
              No credit card required &middot; Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF BANNER ═══════════ */}
      <section className="py-16 sm:py-20 px-5 sm:px-8 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0 }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-8 items-center"
          >
            {/* Image */}
            <motion.div variants={scaleUp} className="relative">
              <img
                src={landing_page.social_proof_image || DEFAULT_IMAGES.humanEntrepreneur}
                alt="Chartered Accountant using the platform"
                className="w-full rounded-2xl shadow-xl object-cover aspect-square"
                loading="lazy"
              />
              <div
                className="absolute -bottom-4 -right-4 glass-card rounded-xl px-5 py-3"
                style={{ background: 'rgba(15,20,35,0.9)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: lightenColor(primary, (n - 1) * 0.15) }}
                      >
                        {['R', 'M', 'P'][n - 1]}
                      </div>
                    ))}
                  </div>
                  <div className="ml-1">
                    <p className="text-sm font-semibold text-slate-200">
                      {lp.social_proof_count || CA_DEFAULTS.social_proof_count} CAs
                    </p>
                    <p className="text-xs text-slate-400">trust this platform</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center gap-1.5 mb-4">
                <Users className="w-4 h-4" style={{ color: primary }} />
                <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: primary }}>
                  Trusted by CAs across India
                </span>
              </div>
              <h2 className="text-3xl sm:text-[2.5rem] font-bold text-slate-100 tracking-[-0.02em] mb-4">
                {lp.social_proof_title}
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                {lp.social_proof_description}
              </p>
              <div className="grid grid-cols-3 gap-4">
                {(lp.social_proof_stats || CA_DEFAULTS.social_proof_stats).map((stat: any) => (
                  <div key={stat.label} className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-xl font-bold text-slate-100">{stat.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ TEAM BANNER ═══════════ */}
      <section className="relative overflow-hidden">
        <div className="relative">
          <img
            src={landing_page.team_banner_image || DEFAULT_IMAGES.humanTeam}
            alt="Modern CA office interior"
            className="w-full h-[300px] sm:h-[400px] object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/85 to-gray-900/50 flex items-center">
            <div className="max-w-6xl mx-auto px-5 sm:px-8 w-full">
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0 }}
                variants={fadeUp}
              >
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 max-w-lg">
                  {lp.cta_section_title}
                </h2>
                <p className="text-gray-300 text-lg mb-6 max-w-md">
                  {lp.cta_section_subtitle}
                </p>
                <button
                  onClick={handleCta}
                  className="inline-flex items-center gap-2 h-12 px-7 rounded-xl text-white font-semibold text-[15px] transition-all hover:brightness-110 hover:shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${primary}, ${lightenColor(primary, 0.12)})`,
                    boxShadow: `0 4px 20px rgba(${rgb}, 0.4)`,
                  }}
                >
                  {lp.cta_text || 'Start Free Trial'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      {landing_page.testimonials?.length > 0 && (
        <section className="py-16 sm:py-20 px-5 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <motion.h2
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0 }}
              variants={fadeUp}
              className="text-3xl font-bold text-slate-100 text-center mb-12 tracking-[-0.02em]"
            >
              What our customers say
            </motion.h2>
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0 }}
              variants={stagger}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {landing_page.testimonials.map((t: any, i: number) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="bg-white/5 rounded-2xl border border-white/10 p-6"
                >
                  <p className="text-slate-300 mb-4 leading-relaxed text-[15px]">"{t.quote || t.text}"</p>
                  <div className="border-t border-white/10 pt-3 flex items-center gap-3">
                    {t.avatar ? (
                      <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                        style={{ backgroundColor: lightenColor(primary, (i % 3) * 0.12) }}
                      >
                        {t.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">{t.name}</p>
                      {t.role && <p className="text-xs text-slate-400 mt-0.5">{t.role}</p>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-white/10 py-8 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-5 w-auto opacity-50" />
            )}
            <span className="text-sm text-slate-500">
              {branding.brand_name || config.subdomain}
            </span>
          </div>
          <a
            href="https://chatslytics.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Powered by chatslytics.com
          </a>
        </div>
      </footer>
    </div>
  );
}
