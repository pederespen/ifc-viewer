// Size and scale constants
export const MEASUREMENT_SIZES = {
	markerRadius: 0.1,
	lineThickness: 0.015,
	labelPadding: 8,
	labelOffset: { x: 10, y: -10 }
} as const;

export const LIGHT_INTENSITY = {
	ambient: 1.0,
	directional: 1.5
} as const;

export const COMPASS_SIZE = {
	axisLength: 20,
	circleRadius: 40
} as const;
