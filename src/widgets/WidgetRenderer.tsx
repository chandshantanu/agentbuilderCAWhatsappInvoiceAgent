/**
 * WidgetRenderer — looks up a widget by type in the registry and renders it.
 *
 * Wraps the widget in Suspense for lazy loading and an error boundary
 * for resilience (one widget failing doesn't crash the whole dashboard).
 */

import React, { Suspense, Component, type ReactNode } from 'react';
import { getWidget } from './WidgetRegistry';
import type { WidgetConfig } from '@/config/types';

interface WidgetRendererProps {
  widget: WidgetConfig;
}

// Simple error boundary for individual widgets
class WidgetErrorBoundary extends Component<
  { widgetType: string; children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { widgetType: string; children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">
            Widget "{this.props.widgetType}" failed to load: {this.state.error}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

function WidgetSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-6">
      <div className="h-4 w-1/3 rounded bg-gray-200 mb-4" />
      <div className="h-32 rounded bg-gray-200" />
    </div>
  );
}

export default function WidgetRenderer({ widget }: WidgetRendererProps) {
  const WidgetComponent = getWidget(widget.type, widget.config);

  if (!WidgetComponent) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-700">Unknown widget type: "{widget.type}"</p>
      </div>
    );
  }

  return (
    <WidgetErrorBoundary widgetType={widget.type}>
      <Suspense fallback={<WidgetSkeleton />}>
        <WidgetComponent config={widget.config || {}} />
      </Suspense>
    </WidgetErrorBoundary>
  );
}
