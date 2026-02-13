/**
 * Widget Registry — maps widget type strings to lazy-loaded React components.
 *
 * Agent-specific widgets are code-split and only loaded when the
 * dashboard config requests them.
 *
 * Dynamic widgets (type starts with "dynamic:") are loaded from CDN
 * via DynamicWidgetLoader and do NOT need to be registered here.
 */

import { lazy, type ComponentType } from 'react';
import { isDynamicWidget, getDynamicWidget } from './DynamicWidgetLoader';

type WidgetLoader = () => Promise<{ default: ComponentType<any> }>;

const WIDGET_REGISTRY: Record<string, WidgetLoader> = {
  // ─── Generic Widgets (shipped with every agent) ───────────────
  stats_card: () => import('./generic/StatsCard'),
  data_table: () => import('./generic/DataTable'),
  chart: () => import('./generic/ChartWidget'),
  form: () => import('./generic/FormWidget'),
  activity_feed: () => import('./generic/ActivityFeed'),

  // ─── CA Invoice Agent ─────────────────────────────────────────
  ca_invoice_table: () => import('./agent-specific/ca-invoices/InvoiceTable'),
  ca_client_management: () => import('./agent-specific/ca-invoices/ClientManagement'),
  ca_export_panel: () => import('./agent-specific/ca-invoices/ExportPanel'),
  ca_whatsapp_status: () => import('./agent-specific/ca-invoices/WhatsAppStatus'),

  // ─── Instagram DM Agent ───────────────────────────────────────
  instagram_conversations: () => import('./agent-specific/instagram/ConversationsPanel'),
  instagram_metrics: () => import('./agent-specific/instagram/MetricsPanel'),
};

/**
 * Get a lazy-loaded component for a widget type.
 *
 * - Built-in widgets: looked up from WIDGET_REGISTRY
 * - Dynamic widgets (type "dynamic:xxx"): loaded from CDN via config.cdn_url
 *
 * Returns null if the widget type is not registered and is not dynamic.
 */
export function getWidget(
  type: string,
  config?: Record<string, unknown>,
): ComponentType<any> | null {
  // Dynamic widget — loaded from CDN
  if (isDynamicWidget(type)) {
    const cdnUrl = config?.cdn_url as string | undefined;
    if (!cdnUrl) {
      console.warn(`[WidgetRegistry] Dynamic widget "${type}" missing cdn_url in config`);
      return null;
    }
    return getDynamicWidget(cdnUrl);
  }

  // Built-in widget
  const loader = WIDGET_REGISTRY[type];
  if (!loader) {
    console.warn(`[WidgetRegistry] Unknown widget type: "${type}"`);
    return null;
  }
  return lazy(loader);
}

export function isRegistered(type: string): boolean {
  return type in WIDGET_REGISTRY || isDynamicWidget(type);
}

export function getRegisteredTypes(): string[] {
  return Object.keys(WIDGET_REGISTRY);
}
