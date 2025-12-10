/**
 * Extract value from IFC property that might be wrapped in an object
 */
export function extractValue(val: unknown): string | null {
	if (!val) return null;
	if (typeof val === 'string') return val;
	if (typeof val === 'object' && val !== null && 'value' in val) {
		return String((val as { value: unknown }).value);
	}
	return null;
}

/**
 * Standardized error handler
 */
export function handleError(
	context: string,
	error: unknown,
	options?: {
		silent?: boolean;
		returnValue?: unknown;
	}
): unknown {
	if (!options?.silent) {
		console.error(`[${context}]`, error);
	}
	return options?.returnValue ?? null;
}
