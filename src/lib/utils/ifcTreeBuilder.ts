import * as OBC from '@thatopen/components';
import type { FragmentGroup, SpatialStructureItem, ItemData } from '$lib/types/viewer';
import { extractValue } from './shared';
import { FragmentsHelper } from './fragments';

export interface TreeNode {
	id: string;
	name: string;
	type: string;
	expressID?: number;
	visible: boolean;
	children: TreeNode[];
}

/**
 * Collect all expressIDs from a node and its descendants
 */
export function collectExpressIDs(node: TreeNode): number[] {
	const ids: number[] = [];
	if (node.expressID !== undefined) {
		ids.push(node.expressID);
	}
	for (const child of node.children) {
		ids.push(...collectExpressIDs(child));
	}
	return ids;
}

/**
 * Build IFC tree structure from loaded model
 */
export async function buildIFCTree(
	components: OBC.Components | null,
	currentModel: FragmentGroup | null
): Promise<TreeNode[]> {
	if (!currentModel || !components) {
		return [];
	}

	try {
		const fragments = FragmentsHelper.get(components);

		if (!fragments.list || fragments.list.size === 0) {
			return [];
		}

		const tree: TreeNode[] = [];

		for (const [modelID, model] of fragments.list) {
			try {
				const modelNode: TreeNode = {
					id: modelID,
					name: model.name || 'IFC Model',
					type: 'Model',
					visible: true,
					children: []
				};

				// Try spatial structure first
				const spatialStructure = await model.getSpatialStructure?.();
				if (spatialStructure) {
					await buildSpatialTree(model, spatialStructure, modelNode.children);
				} else {
					await buildSimpleTree(model, modelNode.children);
				}

				tree.push(modelNode);
			} catch {
				tree.push({
					id: modelID,
					name: model.name || 'IFC Model',
					type: 'Model',
					visible: true,
					children: [
						{
							id: `${modelID}-error`,
							name: 'Error loading structure',
							type: 'Error',
							visible: true,
							children: []
						}
					]
				});
			}
		}

		return tree;
	} catch {
		return [];
	}
}

/**
 * Build tree from spatial structure
 */
async function buildSpatialTree(
	model: FragmentGroup,
	spatialItem: SpatialStructureItem,
	parentChildren: TreeNode[]
): Promise<void> {
	try {
		// Category node without localId - process children
		if (spatialItem.category && spatialItem.localId === null) {
			if (spatialItem.children?.length) {
				for (const child of spatialItem.children) {
					if (child.localId !== null && !child.category) {
						child.category = spatialItem.category;
					}
					await buildSpatialTree(model, child, parentChildren);
				}
			}
			return;
		}

		// Element node with localId
		if (spatialItem.localId !== null && spatialItem.localId !== undefined) {
			let elementName = `Element ${spatialItem.localId}`;
			let elementType = spatialItem.category || 'Element';

			try {
				const itemsData = await model.getItemsData?.([spatialItem.localId], {
					includeAttributes: true
				});

				if (itemsData?.length) {
					const itemData = itemsData[0] as ItemData;
					elementName =
						extractValue(itemData.Name) ||
						extractValue(itemData.name) ||
						extractValue(itemData.LongName) ||
						extractValue(itemData.longName) ||
						`${elementType} ${spatialItem.localId}`;
					elementType = extractValue(itemData._category) || spatialItem.category || 'Element';
				}
			} catch {
				// Use default names
			}

			const node: TreeNode = {
				id: `${model.modelId || 'model'}-${spatialItem.localId}`,
				name: elementName,
				type: elementType,
				expressID: spatialItem.localId,
				visible: true,
				children: []
			};

			if (spatialItem.children?.length) {
				for (const child of spatialItem.children) {
					await buildSpatialTree(model, child, node.children);
				}
			}

			parentChildren.push(node);
		}
	} catch {
		// Silently handle errors
	}
}

/**
 * Build simple tree grouped by type
 */
async function buildSimpleTree(model: FragmentGroup, parentChildren: TreeNode[]): Promise<void> {
	const commonTypes = [
		/WALL/,
		/WINDOW/,
		/DOOR/,
		/SLAB/,
		/BEAM/,
		/COLUMN/,
		/SPACE/,
		/BUILDING/,
		/STOREY/,
		/SITE/,
		/PROJECT/,
		/ROOF/,
		/STAIR/,
		/RAILING/,
		/FURNISHING/,
		/PLATE/,
		/MEMBER/,
		/COVERING/,
		/FOOTING/,
		/PILE/
	];

	try {
		const itemsByCategory = await model.getItemsOfCategories?.(commonTypes);
		if (!itemsByCategory) {
			parentChildren.push({
				id: 'no-items',
				name: 'No items found in model',
				type: 'Info',
				visible: true,
				children: []
			});
			return;
		}

		const itemsByType = new Map<string, TreeNode[]>();
		let totalItems = 0;

		for (const [category, localIds] of Object.entries(itemsByCategory)) {
			if (!localIds?.length) continue;

			const items: TreeNode[] = [];
			const idsToFetch = localIds.slice(0, 50); // Limit for performance

			try {
				const itemsData = await model.getItemsData?.(idsToFetch);
				if (itemsData) {
					for (let i = 0; i < itemsData.length; i++) {
						const itemData = itemsData[i] as ItemData;
						const localId = idsToFetch[i];
						items.push({
							id: `${model.modelId || 'model'}-${localId}`,
							name:
								extractValue(itemData.Name) ||
								extractValue(itemData.name) ||
								`${category} ${localId}`,
							type: category,
							expressID: localId,
							visible: true,
							children: []
						});
						totalItems++;
					}
				}
			} catch {
				// Create basic nodes without detailed data
				for (const localId of idsToFetch) {
					items.push({
						id: `${model.modelId || 'model'}-${localId}`,
						name: `${category} ${localId}`,
						type: category,
						expressID: localId,
						visible: true,
						children: []
					});
					totalItems++;
				}
			}

			if (items.length > 0) {
				itemsByType.set(category, items);
			}
		}

		if (totalItems === 0) {
			parentChildren.push({
				id: 'no-items',
				name: 'No items found in model',
				type: 'Info',
				visible: true,
				children: []
			});
			return;
		}

		for (const [typeName, items] of itemsByType) {
			parentChildren.push({
				id: `type-${typeName}`,
				name: `${typeName} (${items.length})`,
				type: 'TypeGroup',
				visible: true,
				children: items
			});
		}
	} catch {
		parentChildren.push({
			id: 'error',
			name: 'Error building tree',
			type: 'Error',
			visible: true,
			children: []
		});
	}
}
