// Color constants for the application
export const COLORS = {
	// Tool colors
	measurement: 0xf59e0b, // Amber
	slicer: 0x1e40af, // Blue
	hover: 0x3b82f6, // Light blue
	select: 0xef4444, // Red
	treeSelect: 0xf59e0b, // Amber
	treeHover: 0x22c55e, // Green

	// UI colors
	background: '#ffffff',
	ambientLight: 0xffffff,
	directionalLight: 0xffffff
} as const;

export const MATERIAL_OPACITY = {
	hover: 0.3,
	select: 0.5,
	slicer: 0.3
} as const;
