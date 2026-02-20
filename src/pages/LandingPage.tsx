/**
 * Premium SaaS landing page — refined dark-to-light flow.
 * Config-driven: branding, features, pricing, testimonials all from SaaSContext.
 *
 * Design direction: "Refined Authority" — dark hero with luminous accents,
 * crisp white content sections, strong typographic hierarchy, confident CTAs.
 */

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

const FEATURE_ICONS = [FileText, Zap, Shield, BarChart3, Users, Clock];

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
  const primary = branding.primary_color || '#2563eb';
  const rgb = hexToRgb(primary);
  const lightAccent = lightenColor(primary, 0.35);

  const features: Array<{ title: string; description: string }> =
    landing_page.features || [];
  const currencySymbol = pricing.currency === 'INR' ? '\u20B9' : '$';
  const displayPrice = pricing.display_price || pricing.monthly_price;

  const handleCta = () => navigate(isAuthenticated ? '/checkout' : '/signup');

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ═══════════ FIXED HEADER ═══════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-2xl border-b border-gray-200/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-8 w-auto" />
            )}
            <span className="font-semibold text-[17px] text-gray-900 tracking-[-0.01em]">
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
                  className="h-9 px-4 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-colors"
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
      <section className="relative pt-[100px] pb-24 sm:pt-[130px] sm:pb-32 overflow-hidden">
        {/* Dark background */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(168deg, #06090f 0%, #0b1221 35%, #101d35 65%, #0b1221 100%)' }}
        />
        <HeroAtmosphere rgb={rgb} />

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <motion.div initial="hidden" animate="show" variants={stagger}>

            {/* Trust pills — WHITE text for maximum contrast */}
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 sm:gap-5 mb-9 flex-wrap">
              {(landing_page.hero_badges || ['AI-Powered', '24/7 Availability', 'Multi-language']).map((label: string) => (
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
              {landing_page.hero_title || 'Automate Your Practice'}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              className="text-[1.05rem] sm:text-lg text-gray-300 leading-relaxed max-w-xl mx-auto mb-10"
            >
              {landing_page.hero_subtitle || 'AI-powered automation for modern professionals'}
            </motion.p>

            {/* CTA buttons */}
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
              <button
                onClick={handleCta}
                className="group inline-flex items-center gap-2.5 h-[52px] px-8 rounded-xl text-white font-semibold text-[15px] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${primary}, ${lightenColor(primary, 0.12)})`,
                  boxShadow: `0 0 0 1px rgba(${rgb}, 0.3), 0 8px 32px rgba(${rgb}, 0.35), 0 2px 6px rgba(0,0,0,0.15)`,
                }}
              >
                {landing_page.cta_text || 'Start Your Free Trial'}
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
        </div>

        {/* Wave transition → features */}
        <div className="absolute bottom-0 left-0 right-0 leading-[0]">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-12 sm:h-[72px]">
            <path d="M0 40 C360 75, 720 10, 1080 55 S1440 25, 1440 25 L1440 80 L0 80 Z" fill="#f8fafc" />
          </svg>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      {features.length > 0 && (
        <section className="py-16 sm:py-20 px-5 sm:px-8 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
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
                className="text-3xl sm:text-[2.5rem] font-bold text-gray-900 tracking-[-0.02em]"
              >
                Everything you need
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              variants={stagger}
              className={`grid gap-5 ${features.length <= 4 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}
            >
              {features.map((f, i) => {
                const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                return (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="bg-white rounded-2xl border border-gray-200/70 p-6 sm:p-7 transition-shadow duration-300 hover:shadow-lg cursor-default"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `rgba(${rgb}, 0.08)` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: primary }} />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1.5 text-[15px]">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════ PRICING ═══════════ */}
      <section className="py-16 sm:py-20 px-5 sm:px-8 bg-white">
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
            <h2 className="text-3xl sm:text-[2.5rem] font-bold text-gray-900 tracking-[-0.02em]">
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
              background: `linear-gradient(180deg, rgba(${rgb}, 0.04) 0%, #fff 40%)`,
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
            <p className="text-gray-500 text-center text-sm mb-2 mt-2">Monthly subscription</p>
            <div className="flex items-baseline justify-center gap-1 mb-7">
              <span className="text-xl font-medium text-gray-400">{currencySymbol}</span>
              <span className="text-[3.5rem] font-extrabold text-gray-900 tracking-tight leading-none">
                {displayPrice}
              </span>
              <span className="text-gray-400 text-base font-medium">/mo</span>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 mb-6" />

            {/* Feature checklist */}
            <div className="space-y-3.5 mb-8">
              {(landing_page.pricing_features || features.slice(0, 5)).map(
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
                      <span className="text-[14px] text-gray-700 leading-snug">{label}</span>
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
              {landing_page.cta_text || 'Get Started'}
            </button>

            <p className="text-xs text-gray-400 text-center mt-4 tracking-wide">
              No credit card required &middot; Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      {landing_page.testimonials?.length > 0 && (
        <section className="py-16 sm:py-20 px-5 sm:px-8 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <motion.h2
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              className="text-3xl font-bold text-gray-900 text-center mb-12 tracking-[-0.02em]"
            >
              What our customers say
            </motion.h2>
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              variants={stagger}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {landing_page.testimonials.map((t: any, i: number) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="bg-white rounded-2xl border border-gray-200/70 p-6"
                >
                  <p className="text-gray-700 mb-4 leading-relaxed text-[15px]">"{t.quote}"</p>
                  <div className="border-t border-gray-100 pt-3">
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    {t.role && <p className="text-xs text-gray-500 mt-0.5">{t.role}</p>}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-gray-100 py-8 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-5 w-auto opacity-50" />
            )}
            <span className="text-sm text-gray-400">
              {branding.brand_name || config.subdomain}
            </span>
          </div>
          <a
            href="https://chatslytics.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Powered by chatslytics.com
          </a>
        </div>
      </footer>
    </div>
  );
}
