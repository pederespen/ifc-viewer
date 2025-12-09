import * as OBC from '@thatopen/components';

export interface TreeNode {
	id: string;
	name: string;
	type: string;
	expressID?: number;
	visible: boolean;
	children: TreeNode[];
}

// Helper to collect all expressIDs from a node and its descendants
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

export async function buildIFCTree(
	components: OBC.Components | null,
	currentModel: any
): Promise<TreeNode[]> {
	if (!currentModel || !components) {
		return [];
	}

	try {
		const fragments = components.get(OBC.FragmentsManager);
		const fragmentsList = (fragments as any).list;

		if (!fragmentsList || fragmentsList.size === 0) {
			return [];
		}

		const tree: TreeNode[] = [];

		// Get all fragment groups (models)
		for (const [modelID, model] of fragmentsList) {
			try {
				const modelNode: TreeNode = {
					id: modelID,
					name: model.name || 'IFC Model',
					type: 'Model',
					visible: true,
					children: []
				};

				// Try to get spatial structure using ThatOpen API
				try {
					const spatialStructure = await model.getSpatialStructure();

					if (spatialStructure) {
						await buildSpatialTree(model, spatialStructure, modelNode.children);
					} else {
						await buildSimpleTree(model, modelNode.children);
					}
				} catch (err) {
					await buildSimpleTree(model, modelNode.children);
				}

				tree.push(modelNode);
			} catch (err) {
				console.error('Error processing model:', err);
				tree.push({
					id: modelID,
					name: model.name || 'IFC Model',
					type: 'Model',
					visible: true,
					children: [
						{
							id: `${modelID}-error`,
							name: `Error loading structure: ${err}`,
							type: 'Error',
							visible: true,
							children: []
						}
					]
				});
			}
		}

		return tree;
	} catch (err) {
		return [];
	}
}

async function buildSpatialTree(
	model: any,
	spatialItem: any,
	parentChildren: TreeNode[]
): Promise<void> {
	try {
		// Handle the two-level structure from getSpatialStructure:
		// Level 1: {category: 'IFCPROJECT', localId: null, children: [...]}
		// Level 2: {category: null, localId: 1, children: [...]}

		// If this is a category node (has category but no localId)
		if (spatialItem.category && spatialItem.localId === null) {
			// Process children but pass down the category
			if (spatialItem.children && Array.isArray(spatialItem.children)) {
				for (const child of spatialItem.children) {
					// Pass the parent category to children that don't have one
					if (child.localId !== null && !child.category) {
						child.category = spatialItem.category;
					}
					await buildSpatialTree(model, child, parentChildren);
				}
			}
			return;
		}

		// This is an actual element node (has localId)
		if (spatialItem.localId !== null && spatialItem.localId !== undefined) {
			// Get item data for this element
			let itemData: any = null;
			let elementName = `Element ${spatialItem.localId}`;
			let elementType = spatialItem.category || 'Element';

			try {
				// Request item data with attributes
				const itemsData = await model.getItemsData([spatialItem.localId], {
					includeAttributes: true
				});

				if (itemsData && itemsData.length > 0) {
					itemData = itemsData[0];

					// Get the value from objects like {value: 'Name', type: 'IFCLABEL'}
					const getValue = (val: any) => {
						if (!val) return null;
						if (typeof val === 'string') return val;
						if (typeof val === 'object' && val.value) return val.value;
						return null;
					};

					elementName =
						getValue(itemData.Name) ||
						getValue(itemData.name) ||
						getValue(itemData.LongName) ||
						getValue(itemData.longName) ||
						`${elementType} ${spatialItem.localId}`;

					// Get the category/type - data comes with underscore prefix like _category
					elementType = getValue(itemData._category) || spatialItem.category || 'Element';
				}
			} catch (err) {
				// Silently fail and use default names
			}

			const node: TreeNode = {
				id: `${model.modelId || 'model'}-${spatialItem.localId}`,
				name: elementName,
				type: elementType,
				expressID: spatialItem.localId,
				visible: true,
				children: []
			};

			// Process children recursively
			if (spatialItem.children && Array.isArray(spatialItem.children)) {
				for (const child of spatialItem.children) {
					await buildSpatialTree(model, child, node.children);
				}
			}

			parentChildren.push(node);
		}
	} catch (err) {
		// Silently handle error
	}
}

async function buildSimpleTree(model: any, parentChildren: TreeNode[]) {
	try {
		const itemsByType = new Map<string, TreeNode[]>();
		let totalItems = 0;

		// Use the correct ThatOpen API: getItemsOfCategories
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
			// Get items grouped by category
			const itemsByCategory = await model.getItemsOfCategories(commonTypes);

			// For each category, get the item data
			for (const [category, localIds] of Object.entries(itemsByCategory)) {
				if (localIds && Array.isArray(localIds) && localIds.length > 0) {
					const items: TreeNode[] = [];

					// Get item data for all items in this category (limit to 50 per type for performance)
					const idsToFetch = localIds.slice(0, 50);

					try {
						const itemsData = await model.getItemsData(idsToFetch);

						for (let i = 0; i < itemsData.length; i++) {
							const itemData = itemsData[i];
							const localId = idsToFetch[i];

							items.push({
								id: `${model.modelId || 'model'}-${localId}`,
								name: itemData.name || `${category} ${localId}`,
								type: category,
								expressID: localId,
								visible: true,
								children: []
							});
							totalItems++;
						}
					} catch (err) {
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
			}
		} catch (err) {
			// Silently handle error
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

		// Create type groups
		for (const [typeName, items] of itemsByType) {
			parentChildren.push({
				id: `type-${typeName}`,
				name: `${typeName} (${items.length})`,
				type: 'TypeGroup',
				visible: true,
				children: items
			});
		}
	} catch (err) {
		parentChildren.push({
			id: 'error',
			name: `Error: ${err}`,
			type: 'Error',
			visible: true,
			children: []
		});
	}
}
