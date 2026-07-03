/**
 * Camera framing for the landing globe. Pure math (no three.js/React) so the
 * clamping is unit-testable; GlobeScene feeds the result to pointOfView().
 */

/** Camera distance in globe radii — frames the whole sphere with headroom. */
export const GLOBE_POV_ALTITUDE = 2.2;

/**
 * Point of view centered on the home, with latitude clamped off the poles —
 * a camera parked at ±90° would fill the frame with ice and hide every arc.
 */
export function homePov(home: { lat: number; lng: number }) {
  return {
    lat: Math.max(-55, Math.min(70, home.lat)),
    lng: home.lng,
    altitude: GLOBE_POV_ALTITUDE,
  };
}
