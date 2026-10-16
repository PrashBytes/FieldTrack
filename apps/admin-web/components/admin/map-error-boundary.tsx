'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  className?: string;
}

interface MapErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FieldTrack] MapErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={`flex h-full min-h-[360px] w-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/90 p-6 text-center ${
            this.props.className || ''
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-3 border border-amber-200 shadow-sm">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800">
            {this.props.fallbackTitle || 'Map Unavailable'}
          </h4>
          <p className="mt-1.5 text-xs text-slate-500 max-w-sm">
            The telemetry map encountered an initialization state conflict during view navigation.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="mt-4 gap-1.5 text-xs h-8 bg-white hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Map View
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;
