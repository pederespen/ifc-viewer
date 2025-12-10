<script lang="ts">
	import type { TreeNode } from '$lib/utils/ifcTreeBuilder';
	import type { MeasurementData, UnitSystem } from '$lib/utils/measurement';
	import type { SliceData } from '$lib/utils/slicer';
	import SidebarIcon from './SidebarIcon.svelte';
	import TreePanel from './panels/TreePanel.svelte';
	import PropertiesPanel from './panels/PropertiesPanel.svelte';
	import MeasurePanel from './panels/MeasurePanel.svelte';
	import SlicerPanel from './panels/SlicerPanel.svelte';
	import SettingsPanel from './panels/SettingsPanel.svelte';
	import HelpPanel from './panels/HelpPanel.svelte';

	interface Props {
		tree: TreeNode[];
		hasModel: boolean;
		selectedElement: Record<string, unknown> | null;
		onTreeItemClick: (_node: TreeNode) => void;
		onTreeItemHover: (_node: TreeNode | null) => void;
		onVisibilityToggle: (_node: TreeNode) => void;
		onClearSelection: () => void;
		measurementEnabled: boolean;
		onMeasurementToggle: () => void;
		measurements: MeasurementData[];
		onDeleteMeasurement: (_id: number) => void;
		onClearMeasurements: () => void;
		unitSystem: UnitSystem;
		onUnitSystemChange: (_unit: UnitSystem) => void;
		slicerEnabled: boolean;
		onSlicerToggle: () => void;
		slices: SliceData[];
		onDeleteSlice: (_id: string) => void;
		onClearSlices: () => void;
	}

	let {
		tree,
		hasModel,
		selectedElement,
		onTreeItemClick,
		onTreeItemHover,
		onVisibilityToggle,
		onClearSelection,
		measurementEnabled,
		onMeasurementToggle,
		measurements,
		onDeleteMeasurement,
		onClearMeasurements,
		unitSystem,
		onUnitSystemChange,
		slicerEnabled,
		onSlicerToggle,
		slices,
		onDeleteSlice,
		onClearSlices
	}: Props = $props();

	let activePanel: string | null = $state(null);

	function togglePanel(panel: string) {
		activePanel = activePanel === panel ? null : panel;

		// Disable measurement mode when leaving measure panel (but keep existing measurements)
		if (activePanel !== 'measure' && measurementEnabled) {
			onMeasurementToggle();
		}

		// Enable measurement mode when entering measure panel
		if (activePanel === 'measure' && !measurementEnabled) {
			// Clear any selection when entering measure mode
			onClearSelection();
			onMeasurementToggle();
		}

		// Disable slicer mode when leaving slicer panel (but keep existing slices)
		if (activePanel !== 'slicer' && slicerEnabled) {
			onSlicerToggle();
		}

		// Enable slicer mode when entering slicer panel
		if (activePanel === 'slicer' && !slicerEnabled) {
			onClearSelection();
			onSlicerToggle();
		}
	}

	// Open properties panel when an element is selected
	$effect(() => {
		if (selectedElement) {
			activePanel = 'properties';
		}
	});
</script>

<!-- Side Panel Container -->
<div class="relative z-10 flex h-full w-16">
	<!-- Icon Sidebar (Always Visible) -->
	<div
		class="flex h-full w-16 flex-col justify-between border-r border-gray-200 bg-gray-800 shadow-sm"
	>
		<!-- Top Menu Items -->
		<div class="flex flex-col gap-1 p-2">
			<SidebarIcon
				icon="tree"
				label="IFC Tree"
				isActive={activePanel === 'tree'}
				onClick={() => togglePanel('tree')}
			/>
			<SidebarIcon
				icon="measure"
				label="Measure"
				isActive={activePanel === 'measure'}
				isEnabled={measurementEnabled}
				onClick={() => togglePanel('measure')}
			/>
			<SidebarIcon
				icon="slicer"
				label="Slicer"
				isActive={activePanel === 'slicer'}
				isEnabled={slicerEnabled}
				onClick={() => togglePanel('slicer')}
			/>
			<SidebarIcon
				icon="properties"
				label="Properties"
				isActive={activePanel === 'properties'}
				onClick={() => togglePanel('properties')}
			/>
		</div>

		<!-- Bottom Menu Items -->
		<div class="flex flex-col gap-1 p-2">
			<SidebarIcon
				icon="settings"
				label="Settings"
				isActive={activePanel === 'settings'}
				onClick={() => togglePanel('settings')}
			/>
			<SidebarIcon
				icon="help"
				label="Help"
				isActive={activePanel === 'help'}
				onClick={() => togglePanel('help')}
			/>
		</div>
	</div>
	<!-- Slide-out Panel (Positioned Absolutely) -->
	<div
		class="absolute top-0 left-16 h-full overflow-hidden border-r border-gray-200 bg-white shadow-lg transition-all duration-300 ease-in-out {activePanel
			? 'w-96'
			: 'w-0'}"
	>
		<!-- IFC Tree Panel -->
		{#if activePanel === 'tree'}
			<TreePanel
				{tree}
				{hasModel}
				onItemClick={onTreeItemClick}
				onItemHover={onTreeItemHover}
				{onVisibilityToggle}
				onClose={() => togglePanel('tree')}
			/>
		{/if}

		<!-- Properties Panel -->
		{#if activePanel === 'properties'}
			<PropertiesPanel
				{selectedElement}
				{onClearSelection}
				onClose={() => togglePanel('properties')}
			/>
		{/if}

		<!-- Help Panel -->
		{#if activePanel === 'help'}
			<HelpPanel onClose={() => togglePanel('help')} />
		{/if}

		<!-- Measure Panel -->
		{#if activePanel === 'measure'}
			<MeasurePanel
				{measurements}
				{onDeleteMeasurement}
				{onClearMeasurements}
				onClose={() => togglePanel('measure')}
			/>
		{/if}

		<!-- Slicer Panel -->
		{#if activePanel === 'slicer'}
			<SlicerPanel {slices} {onDeleteSlice} {onClearSlices} onClose={() => togglePanel('slicer')} />
		{/if}

		<!-- Settings Panel -->
		{#if activePanel === 'settings'}
			<SettingsPanel {unitSystem} {onUnitSystemChange} onClose={() => togglePanel('settings')} />
		{/if}
	</div>
</div>
