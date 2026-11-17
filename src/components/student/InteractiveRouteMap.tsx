import React from 'react';
import { Route, Bus, RouteStop } from '../../types/transit';
import { LiveBusTrackingMap } from './LiveBusTrackingMap';

export interface InteractiveRouteMapProps {
  route: Route;
  bus: Bus;
  userStopId?: string;
  allBuses?: Bus[];
  allRoutes?: Route[];
  onSelectStop?: (stop: RouteStop) => void;
  onToggleSimulation?: (busId: string) => void;
  onAdvanceStop?: (busId: string) => void;
  onRefreshTelemetry?: () => void;
  calculateStopEta?: (bus: Bus, stopId: string) => { minutes: number; text: string; isPassed: boolean; isCurrent: boolean };
}

/**
 * InteractiveRouteMap - Backward-compatible wrapper delegating to the SVG LiveBusTrackingMap component.
 */
export const InteractiveRouteMap: React.FC<InteractiveRouteMapProps> = (props) => {
  return <LiveBusTrackingMap {...props} />;
};

export { LiveBusTrackingMap };
