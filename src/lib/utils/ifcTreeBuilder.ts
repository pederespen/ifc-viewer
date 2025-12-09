import * as OBC from '@thatopen/components';

export interface TreeNode {
	id: string;
	name: string;
	type: string;
	expressID?: number;
	children: TreeNode[];
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
					children: [
						{
							id: `${modelID}-error`,
							name: `Error loading structure: ${err}`,
							type: 'Error',
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
			// Skip the category wrapper and process its children directly
			if (spatialItem.children && Array.isArray(spatialItem.children)) {
				for (const child of spatialItem.children) {
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

					// Try various ways to get the name
					// Names can be strings or objects like {value: 'Name', type: 'IFCLABEL'}
					const getName = (val: any) => {
						if (!val) return null;
						if (typeof val === 'string') return val;
						if (typeof val === 'object' && val.value) return val.value;
						return null;
					};

					elementName =
						getName(itemData.name) ||
						getName(itemData.Name) ||
						getName(itemData.longName) ||
						getName(itemData.LongName) ||
						getName(itemData.attributes?.Name) ||
						getName(itemData.attributes?.name) ||
						getName(itemData.attributes?.LongName) ||
						`${elementType} ${spatialItem.localId}`;

					// Get the category/type
					elementType = itemData.category || itemData.type || spatialItem.category || 'Element';
				}
			} catch (err) {
				// Silently fail and use default names
			}

			const node: TreeNode = {
				id: `${model.modelId || 'model'}-${spatialItem.localId}`,
				name: elementName,
				type: elementType,
				expressID: spatialItem.localId,
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
				children: items
			});
		}
	} catch (err) {
		parentChildren.push({
			id: 'error',
			name: `Error: ${err}`,
			type: 'Error',
			children: []
		});
	}
}
