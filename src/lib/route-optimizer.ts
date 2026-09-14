/**
 * Route Optimization Engine — Traveling Salesperson Problem (TSP) Solver
 * ---------------------------------------------------------------------
 * Solves multi-stop daily route sequencing for field service technicians to
 * minimize windshield time, mileage, and fuel expenditure.
 *
 * Algorithm:
 *   1. Nearest Neighbor heuristic to construct initial tour from start depot.
 *   2. 2-opt local search optimization to eliminate route crossings/detours.
 *   3. Recomputes arrival time windows based on job durations and driving times.
 */

export interface GeoCoordinate {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

export interface RouteStop extends GeoCoordinate {
  id: string;
  title: string;
  customerName?: string | null;
  scheduledAt?: string | null;
  estimatedDurationMinutes: number;
  priority?: string | null;
  status?: string;
}

export interface OptimizationResult {
  originalStops: RouteStop[];
  optimizedStops: RouteStop[];
  originalDistanceKm: number;
  optimizedDistanceKm: number;
  distanceSavedKm: number;
  percentageSaved: number;
  originalDriveMinutes: number;
  optimizedDriveMinutes: number;
  timeSavedMinutes: number;
  estimatedFuelSavingsUsd: number;
  timeline: Array<{
    stopId: string;
    sequence: number;
    title: string;
    estimatedArrival: string;
    estimatedDeparture: string;
    driveMinutesFromPrevious: number;
    distanceKmFromPrevious: number;
  }>;
}

/**
 * Haversine formula to compute great-circle distance between two points in km.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate drive time in minutes from distance assuming standard urban/suburban speeds (~42 km/h + 3 min buffer).
 */
export function estimateDriveMinutes(distanceKm: number): number {
  if (distanceKm <= 0.1) return 0;
  const averageSpeedKmH = 42;
  const driveMinutes = (distanceKm / averageSpeedKmH) * 60 + 3; // +3 min for traffic/parking
  return Math.round(driveMinutes);
}

/**
 * Total route distance for an ordered array of coordinates starting from a depot.
 */
export function calculateTotalRouteDistance(startLocation: GeoCoordinate, stops: GeoCoordinate[]): number {
  if (stops.length === 0) return 0;
  let total = haversineDistanceKm(startLocation.lat, startLocation.lng, stops[0].lat, stops[0].lng);
  for (let i = 0; i < stops.length - 1; i++) {
    total += haversineDistanceKm(stops[i].lat, stops[i].lng, stops[i + 1].lat, stops[i + 1].lng);
  }
  return total;
}

/**
 * 2-opt swap helper for TSP.
 */
function twoOptSwap<T>(route: T[], i: number, k: number): T[] {
  const newRoute = route.slice(0, i);
  const reversedSubsegment = route.slice(i, k + 1).reverse();
  const remaining = route.slice(k + 1);
  return [...newRoute, ...reversedSubsegment, ...remaining];
}

/**
 * Solve TSP using Nearest Neighbor initialization + 2-opt improvement.
 */
export function optimizeRoute(
  startLocation: GeoCoordinate,
  stops: RouteStop[],
  startTime: Date = new Date()
): OptimizationResult {
  if (stops.length <= 1) {
    const dist = stops.length === 1 ? haversineDistanceKm(startLocation.lat, startLocation.lng, stops[0].lat, stops[0].lng) : 0;
    const driveMin = estimateDriveMinutes(dist);
    return {
      originalStops: stops,
      optimizedStops: stops,
      originalDistanceKm: dist,
      optimizedDistanceKm: dist,
      distanceSavedKm: 0,
      percentageSaved: 0,
      originalDriveMinutes: driveMin,
      optimizedDriveMinutes: driveMin,
      timeSavedMinutes: 0,
      estimatedFuelSavingsUsd: 0,
      timeline: stops.map((s, idx) => ({
        stopId: s.id,
        sequence: idx + 1,
        title: s.title,
        estimatedArrival: startTime.toISOString(),
        estimatedDeparture: new Date(startTime.getTime() + s.estimatedDurationMinutes * 60000).toISOString(),
        driveMinutesFromPrevious: driveMin,
        distanceKmFromPrevious: dist,
      })),
    };
  }

  const originalDistance = calculateTotalRouteDistance(startLocation, stops);
  const originalDriveMinutes = estimateDriveMinutes(originalDistance);

  // 1. Nearest Neighbor construction
  const unvisited = [...stops];
  const initialTour: RouteStop[] = [];
  let currentPos = startLocation;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineDistanceKm(currentPos.lat, currentPos.lng, unvisited[i].lat, unvisited[i].lng);
      if (d < minDistance) {
        minDistance = d;
        nearestIdx = i;
      }
    }

    const [nextStop] = unvisited.splice(nearestIdx, 1);
    initialTour.push(nextStop);
    currentPos = nextStop;
  }

  // 2. 2-opt local search heuristic
  let bestTour = [...initialTour];
  let bestDistance = calculateTotalRouteDistance(startLocation, bestTour);
  let improved = true;
  let iterations = 0;
  const maxIterations = 50;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < bestTour.length - 1; i++) {
      for (let k = i + 1; k < bestTour.length; k++) {
        const candidateTour = twoOptSwap(bestTour, i, k);
        const candidateDistance = calculateTotalRouteDistance(startLocation, candidateTour);

        if (candidateDistance < bestDistance - 0.01) {
          bestTour = candidateTour;
          bestDistance = candidateDistance;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  const distanceSaved = Math.max(0, originalDistance - bestDistance);
  const percentageSaved = originalDistance > 0 ? Math.round((distanceSaved / originalDistance) * 100) : 0;
  const optimizedDriveMinutes = estimateDriveMinutes(bestDistance);
  const timeSavedMinutes = Math.max(0, originalDriveMinutes - optimizedDriveMinutes);
  // Estimate fuel savings assuming ~$0.22/km fuel & vehicle wear cost
  const estimatedFuelSavingsUsd = Math.round(distanceSaved * 0.22 * 100) / 100;

  // 3. Build optimized timeline with arrival and departure timestamps
  let runningClock = new Date(startTime.getTime());
  let prevPos = startLocation;

  const timeline = bestTour.map((stop, index) => {
    const legDistance = haversineDistanceKm(prevPos.lat, prevPos.lng, stop.lat, stop.lng);
    const legDriveMinutes = estimateDriveMinutes(legDistance);

    // Arrival time = clock + drive time
    const arrivalTime = new Date(runningClock.getTime() + legDriveMinutes * 60000);
    // Departure time = arrival time + job duration
    const departureTime = new Date(arrivalTime.getTime() + (stop.estimatedDurationMinutes || 60) * 60000);

    // Update clock for next iteration
    runningClock = departureTime;
    prevPos = stop;

    return {
      stopId: stop.id,
      sequence: index + 1,
      title: stop.title,
      estimatedArrival: arrivalTime.toISOString(),
      estimatedDeparture: departureTime.toISOString(),
      driveMinutesFromPrevious: legDriveMinutes,
      distanceKmFromPrevious: Math.round(legDistance * 10) / 10,
    };
  });

  return {
    originalStops: stops,
    optimizedStops: bestTour,
    originalDistanceKm: Math.round(originalDistance * 10) / 10,
    optimizedDistanceKm: Math.round(bestDistance * 10) / 10,
    distanceSavedKm: Math.round(distanceSaved * 10) / 10,
    percentageSaved,
    originalDriveMinutes,
    optimizedDriveMinutes,
    timeSavedMinutes,
    estimatedFuelSavingsUsd,
    timeline,
  };
}
