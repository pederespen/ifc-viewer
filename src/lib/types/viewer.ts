import type * as THREE from 'three';
import type * as OBC from '@thatopen/components';

// Fragment types based on ThatOpen API
export interface FragmentGroup {
	name?: string;
	modelId?: string;
	object?: THREE.Object3D;
	useCamera?: (camera: unknown) => void;
	setVisible?: (localIds: number[], visible: boolean) => void;
	getItemsData?: (
		localIds: number[],
		options?: { includeAttributes?: boolean }
	) => Promise<ItemData[]>;
	getSpatialStructure?: () => Promise<SpatialStructureItem>;
	getItemsOfCategories?: (categories: RegExp[]) => Promise<Record<string, number[]>>;
}

export interface FragmentsList {
	get?: (modelID: string) => FragmentGroup | undefined;
	keys: () => IterableIterator<string>;
	size: number;
	[Symbol.iterator](): IterableIterator<[string, FragmentGroup]>;
}

export interface FragmentsManager {
	list: FragmentsList;
	init?: (url: string) => void;
	core?: {
		update?: (force: boolean) => void;
	};
}

// IFC Item data
export interface ItemData {
	Name?: { value: string; type: string } | string;
	name?: { value: string; type: string } | string;
	LongName?: { value: string; type: string } | string;
	longName?: { value: string; type: string } | string;
	_category?: { value: string; type: string } | string;
	[key: string]: unknown;
}

// Spatial structure from getSpatialStructure()
export interface SpatialStructureItem {
	category?: string | null;
	localId: number | null;
	children?: SpatialStructureItem[];
}

// IFC Loader type
export interface IFCLoader {
	setup?: (config?: {
		autoSetWasm?: boolean;
		wasm?: {
			path: string;
			absolute: boolean;
		};
	}) => Promise<void>;
	load?: (data: Uint8Array, streaming: boolean, name: string) => Promise<LoadedModel>;
}

// Loaded model
export interface LoadedModel {
	object?: THREE.Object3D;
}

// Highlighter event types
export type ModelIdMap = Record<string, Set<number>>;

export interface HighlighterEvents {
	select: {
		onHighlight: {
			add: (handler: (modelIdMap: ModelIdMap) => void) => void;
		};
	};
}

// Compass axis data
export interface CompassAxis {
	x: number;
	y: number;
	z: number;
}

export interface CompassAxes {
	x: CompassAxis;
	y: CompassAxis;
	z: CompassAxis;
}

// Selected element properties
export interface SelectedElement {
	ExpressID: number;
	ModelID?: string;
	Name?: string;
	[key: string]: unknown;
}

// World type
export type ViewerWorld = OBC.World;
