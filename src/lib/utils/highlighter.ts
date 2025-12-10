import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import type {
	ModelIdMap,
	SelectedElement,
	FragmentsManager,
	FragmentGroup
} from '$lib/types/viewer';

export interface HighlightStyle {
	color: THREE.Color;
	opacity: number;
	transparent: boolean;
	renderedFaces: number;
	depthTest?: boolean;
}

export const HIGHLIGHT_STYLES = {
	// Solid orange for model double-click selection
	select: {
		color: new THREE.Color(0xf59e0b),
		opacity: 1,
		transparent: false,
		renderedFaces: 0
	},
	// Transparent x-ray blue for tree selection
	treeSelect: {
		color: new THREE.Color(0x3b82f6),
		opacity: 0.4,
		transparent: true,
		depthTest: false,
		renderedFaces: 1
	},
	// Solid light blue for 3D viewer hover
	hover: {
		color: new THREE.Color(0x93c5fd),
		opacity: 1,
		transparent: false,
		renderedFaces: 0
	},
	// Transparent x-ray indigo for tree hover
	treeHover: {
		color: new THREE.Color(0x6366f1),
		opacity: 0.4,
		transparent: true,
		renderedFaces: 1,
		depthTest: false
	}
} as const;

export type HighlightStyleName = keyof typeof HIGHLIGHT_STYLES;

/**
 * Setup the highlighter with all styles and event handlers
 */
export function setupHighlighter(
	components: OBC.Components,
	world: OBC.World,
	onSelect: (element: SelectedElement | null) => void
): void {
	const highlighter = components.get(OBCF.Highlighter);

	// Disable default click-to-select (we use double-click)
	highlighter.setup({ world, selectEnabled: false });
	highlighter.zoomToSelection = false;

	// Register all highlight styles
	for (const [name, style] of Object.entries(HIGHLIGHT_STYLES)) {
		highlighter.styles.set(name, style);
	}

	// Setup hover on pointermove
	const rendererEl = world.renderer?.three.domElement;
	if (rendererEl) {
		rendererEl.addEventListener('pointermove', () => {
			highlighter.highlight('hover', true, false).catch(() => {});
		});

		// Double-click to select
		rendererEl.addEventListener('dblclick', () => {
			highlighter.clear('treeSelect');
			highlighter.highlight('select', true, false).catch(() => {});
		});
	}

	// Handle selection events
	const events = highlighter as unknown as {
		events: { select: { onHighlight: { add: (fn: (map: ModelIdMap) => void) => void } } };
	};
	events.events.select.onHighlight.add(async (modelIdMap: ModelIdMap) => {
		const element = await getSelectedElementData(components, modelIdMap);
		onSelect(element);
	});
}

/**
 * Get element data from selection
 */
async function getSelectedElementData(
	components: OBC.Components,
	modelIdMap: ModelIdMap
): Promise<SelectedElement | null> {
	if (!modelIdMap || Object.keys(modelIdMap).length === 0) {
		return null;
	}

	try {
		const modelID = Object.keys(modelIdMap)[0];
		const fragmentIdsSet = modelIdMap[modelID];

		if (!(fragmentIdsSet instanceof Set) || fragmentIdsSet.size === 0) {
			return null;
		}

		const fragmentID = Array.from(fragmentIdsSet)[0];
		const fragments = components.get(OBC.FragmentsManager) as unknown as FragmentsManager;
		const fragmentGroup = fragments.list.get?.(modelID) as FragmentGroup | undefined;

		if (fragmentGroup?.getItemsData) {
			const itemsData = await fragmentGroup.getItemsData([fragmentID]);

			if (itemsData && itemsData.length > 0) {
				return {
					ExpressID: fragmentID,
					...(itemsData[0] as Record<string, unknown>)
				};
			}
		}

		return {
			ExpressID: fragmentID,
			ModelID: modelID,
			Name: 'IFC Element'
		};
	} catch {
		return null;
	}
}

/**
 * Clear all highlight styles
 */
export function clearAllHighlights(components: OBC.Components): void {
	const highlighter = components.get(OBCF.Highlighter);
	highlighter.clear('select');
	highlighter.clear('treeSelect');
	highlighter.clear('treeHover');
	highlighter.clear('hover');
}

/**
 * Clear selection highlights (not hover)
 */
export function clearSelection(components: OBC.Components): void {
	const highlighter = components.get(OBCF.Highlighter);
	highlighter.clear('select');
	highlighter.clear('treeSelect');
	highlighter.clear('treeHover');
}

/**
 * Highlight elements by ID with a specific style
 */
export function highlightByID(
	components: OBC.Components,
	styleName: HighlightStyleName,
	modelIdMap: ModelIdMap
): void {
	const highlighter = components.get(OBCF.Highlighter);
	highlighter.highlightByID(styleName, modelIdMap, true, false);
}

/**
 * Get the first model name from fragments
 */
export function getFirstModelName(components: OBC.Components): string | undefined {
	const fragments = components.get(OBC.FragmentsManager) as unknown as FragmentsManager;
	return fragments.list.keys().next().value;
}
