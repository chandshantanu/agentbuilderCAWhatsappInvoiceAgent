/**
 * Dashboard configuration types.
 *
 * These mirror the `dashboard` section of the agent graph JSON
 * served by the runtime at GET /config/dashboard.
 */

export interface WidgetConfig {
  type: string;
  config?: Record<string, unknown>;
}

export interface TabConfig {
  id: string;
  label: string;
  icon?: string;
  widgets: WidgetConfig[];
}

export interface BrandingConfig {
  brand_name?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
  text_color?: string;
  font_family?: string;
  custom_css?: string;
  show_powered_by?: boolean;
}

export interface DashboardConfig {
  layout?: 'minimal' | 'standard' | 'full';
  navigation?: 'sidebar' | 'topbar';
  theme?: 'light' | 'dark' | 'auto';
  branding?: BrandingConfig;
  tabs?: TabConfig[];
}

export interface ConfigStatusResponse {
  configured: boolean;
  missing_fields: ConfigField[];
  completed_fields: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  sensitive?: boolean;
  setup_type?: string;
  value?: string;
}

export interface DashboardConfigResponse {
  subscription_id: string;
  agent_id: string;
  dashboard: DashboardConfig;
}
