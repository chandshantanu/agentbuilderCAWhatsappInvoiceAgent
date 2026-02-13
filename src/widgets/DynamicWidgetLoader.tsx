/**
 * DynamicWidgetLoader — loads ESM bundles from CDN at runtime.
 *
 * Generated widgets are compiled by the Widget Build Service into ES modules
 * that import shared libs (react, recharts, etc.) via the import map declared
 * in index.html.  This loader fetches and caches those modules, returning a
 * lazy React component that integrates with the standard Suspense/ErrorBoundary
 * rendering path used by WidgetRenderer.
 */

import { lazy, type ComponentType } from 'react';

/** In-memory cache so we only import() each URL once per session. */
const moduleCache = new Map<string, ComponentType<any>>();

/**
 * Return a lazy-loaded React component backed by a remote ESM bundle.
 *
 * @param cdnUrl  Fully-qualified URL of the compiled widget bundle
 *                (e.g. https://widgets.chatslytics.com/abc/kanban.v1.js)
 */
export function getDynamicWidget(cdnUrl: string): ComponentType<any> {
  const cached = moduleCache.get(cdnUrl);
  if (cached) return cached;

  const LazyWidget = lazy(
    () => import(/* @vite-ignore */ cdnUrl) as Promise<{ default: ComponentType<any> }>
  );

  moduleCache.set(cdnUrl, LazyWidget);
  return LazyWidget;
}

/**
 * Check whether a widget type string represents a dynamic (CDN-loaded) widget.
 * Convention: type starts with "dynamic:" prefix.
 */
export function isDynamicWidget(type: string): boolean {
  return type.startsWith('dynamic:');
}

/**
 * Extract the readable widget name from a dynamic type string.
 * e.g. "dynamic:kanban_leads_board" → "kanban_leads_board"
 */
export function getDynamicWidgetName(type: string): string {
  return type.replace(/^dynamic:/, '');
}
