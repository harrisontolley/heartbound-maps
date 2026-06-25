// Angle + earth constants shared by the geo functions.

export const R_EARTH_KM = 6371;

export const toRad = (d: number): number => (d * Math.PI) / 180;
export const toDeg = (r: number): number => (r * 180) / Math.PI;
