<script lang="ts">
	import TreeView from './TreeView.svelte';
	import type { TreeNode } from '$lib/utils/ifcTreeBuilder';
	import type { MeasurementData, UnitSystem } from '$lib/utils/measurement';

	interface Props {
		tree: TreeNode[];
		hasModel: boolean;
		selectedElement: Record<string, unknown> | null;
		onTreeItemClick: (node: TreeNode) => void;
		onTreeItemHover: (node: TreeNode | null) => void;
		onVisibilityToggle: (node: TreeNode) => void;
		onClearSelection: () => void;
		measurementEnabled: boolean;
		onMeasurementToggle: () => void;
		measurements: MeasurementData[];
		onDeleteMeasurement: (id: number) => void;
		onClearMeasurements: () => void;
		unitSystem: UnitSystem;
		onUnitSystemChange: (unit: UnitSystem) => void;
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
		onUnitSystemChange
	}: Props = $props();

	let activePanel: string | null = $state(null);
	let expandedHelpItems = $state(new Set<string>());

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
	}

	function toggleHelpItem(id: string) {
		const newSet = new Set(expandedHelpItems);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		expandedHelpItems = newSet;
	}

	// Open properties panel when an element is selected
	$effect(() => {
		if (selectedElement) {
			activePanel = 'properties';
		}
	});

	const helpItems = [
		{
			id: 'tree',
			title: 'IFC Tree',
			icon: 'tree',
			content:
				'Browse the building structure hierarchically. Click items to expand or collapse. Hover over items to highlight them in the 3D view with a transparent x-ray effect. Use the eye icon to toggle visibility of elements and their children.'
		},
		{
			id: 'properties',
			title: 'Properties',
			icon: 'properties',
			content:
				'Double-click any element in the 3D view to select it and view its properties. The properties panel shows all IFC attributes and property sets for the selected element.'
		},
		{
			id: 'measure',
			title: 'Measure',
			icon: 'measure',
			content:
				'Toggle measure mode to measure distances. Double-click to place the first point, then double-click again to complete the measurement. The distance is shown on the line.'
		}
	];
</script>

<!-- Side Panel Container -->
<div class="relative z-10 flex h-full w-16">
	<!-- Icon Sidebar (Always Visible) -->
	<div class="flex h-full w-16 flex-col border-r border-gray-200 bg-gray-800 shadow-sm">
		<!-- Menu Items -->
		<div class="flex flex-col gap-1 p-2">
			<!-- IFC Tree Icon -->
			<button
				onclick={() => togglePanel('tree')}
				class="group relative flex h-12 w-12 items-center justify-center rounded-lg transition-colors {activePanel ===
				'tree'
					? 'bg-blue-600 text-white'
					: 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
				aria-label="IFC Tree"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M3 3h4v4H3zM13 7h4v4h-4zM13 17h4v4h-4z" />
					<path d="M5 7v6h8M5 13h8v4" />
				</svg>
				<!-- Tooltip -->
				<div
					class="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-gray-900 px-2 py-1 text-sm whitespace-nowrap text-white shadow-lg group-hover:block"
				>
					IFC Tree
				</div>
			</button>

			<!-- Measure Icon -->
			<button
				onclick={() => togglePanel('measure')}
				class="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg transition-colors {activePanel ===
				'measure'
					? 'bg-blue-600 text-white'
					: measurementEnabled
						? 'bg-green-600 text-white'
						: 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
				aria-label="Measure"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path
						d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"
					/>
					<path d="m14.5 12.5 2-2" />
					<path d="m11.5 9.5 2-2" />
					<path d="m8.5 6.5 2-2" />
					<path d="m17.5 15.5 2-2" />
				</svg>
				<!-- Tooltip -->
				<div
					class="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-gray-900 px-2 py-1 text-sm whitespace-nowrap text-white shadow-lg group-hover:block"
				>
					Measure
				</div>
			</button>

			<!-- Properties Icon -->
			<button
				onclick={() => togglePanel('properties')}
				class="group relative flex h-12 w-12 items-center justify-center rounded-lg transition-colors {activePanel ===
				'properties'
					? 'bg-blue-600 text-white'
					: 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
				aria-label="Properties"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
					<line x1="16" y1="13" x2="8" y2="13" />
					<line x1="16" y1="17" x2="8" y2="17" />
					<polyline points="10 9 9 9 8 9" />
				</svg>
				<!-- Tooltip -->
				<div
					class="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-gray-900 px-2 py-1 text-sm whitespace-nowrap text-white shadow-lg group-hover:block"
				>
					Properties
				</div>
			</button>

			<!-- Settings Icon -->
			<button
				onclick={() => togglePanel('settings')}
				class="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg transition-colors {activePanel ===
				'settings'
					? 'bg-blue-600 text-white'
					: 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
				aria-label="Settings"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="3" />
					<path
						d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
					/>
				</svg>
				<!-- Tooltip -->
				<div
					class="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-gray-900 px-2 py-1 text-sm whitespace-nowrap text-white shadow-lg group-hover:block"
				>
					Settings
				</div>
			</button>

			<!-- Help Icon -->
			<button
				onclick={() => togglePanel('help')}
				class="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg transition-colors {activePanel ===
				'help'
					? 'bg-blue-600 text-white'
					: 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
				aria-label="Help"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
					<line x1="12" y1="17" x2="12.01" y2="17" />
				</svg>
				<!-- Tooltip -->
				<div
					class="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-gray-900 px-2 py-1 text-sm whitespace-nowrap text-white shadow-lg group-hover:block"
				>
					Help
				</div>
			</button>
		</div>
	</div>

	<!-- Slide-out Panel (Positioned Absolutely) -->
	<div
		class="absolute top-0 left-16 h-full overflow-hidden border-r border-gray-200 bg-white shadow-lg transition-all duration-300 ease-in-out {activePanel
			? 'w-96'
			: 'w-0'}"
	>
		<!-- IFC Tree Panel - Always rendered, visibility controlled by CSS -->
		<div class="flex h-full w-96 flex-col {activePanel === 'tree' ? '' : 'hidden'}">
			<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
				<h2 class="font-semibold text-gray-900">IFC Tree</h2>
				<button
					onclick={() => togglePanel('tree')}
					class="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
					aria-label="Close panel"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<div class="flex-1 overflow-y-auto bg-gray-50 p-2">
				<TreeView
					{tree}
					{hasModel}
					onItemClick={onTreeItemClick}
					onItemHover={onTreeItemHover}
					{onVisibilityToggle}
				/>
			</div>
		</div>

		<!-- Properties Panel - Always rendered, visibility controlled by CSS -->
		<div class="flex h-full w-96 flex-col {activePanel === 'properties' ? '' : 'hidden'}">
			<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
				<h2 class="font-semibold text-gray-900">Properties</h2>
				<button
					onclick={() => togglePanel('properties')}
					class="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
					aria-label="Close panel"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<div class="flex-1 overflow-y-auto p-4">
				{#if selectedElement}
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<h4 class="text-sm font-semibold text-gray-900">Element Details</h4>
							<button
								onclick={onClearSelection}
								class="rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
							>
								Clear
							</button>
						</div>
						<div class="space-y-3">
							{#each Object.entries(selectedElement) as [key, value]}
								{@const displayValue =
									typeof value === 'object' && value !== null && 'value' in value
										? value.value
										: value}
								{@const shouldDisplay =
									displayValue !== null &&
									displayValue !== undefined &&
									typeof displayValue !== 'object'}

								{#if shouldDisplay}
									<div>
										<dt class="text-xs font-medium tracking-wider text-gray-500 uppercase">
											{key.replace(/^_/, '')}
										</dt>
										<dd class="mt-1 text-sm break-words text-gray-900">{displayValue}</dd>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{:else}
					<p class="text-sm text-gray-500">Double-click an element to view its properties</p>
				{/if}
			</div>
		</div>

		<!-- Help Panel -->
		<div class="flex h-full w-96 flex-col {activePanel === 'help' ? '' : 'hidden'}">
			<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
				<h2 class="font-semibold text-gray-900">Help</h2>
				<button
					onclick={() => togglePanel('help')}
					class="cursor-pointer rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
					aria-label="Close panel"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<div class="flex-1 overflow-y-auto p-4">
				<p class="mb-4 text-sm text-gray-500">
					A free, browser-based IFC viewer for exploring BIM models. Built with
					<a
						href="https://github.com/ThatOpen/engine_components"
						target="_blank"
						class="text-blue-600 hover:underline">That Open Engine</a
					>
					and
					<a
						href="https://github.com/IFCjs/web-ifc"
						target="_blank"
						class="text-blue-600 hover:underline">web-ifc</a
					>.
				</p>
				<div class="space-y-1">
					{#each helpItems as item}
						<div>
							<button
								onclick={() => toggleHelpItem(item.id)}
								class="flex w-full cursor-pointer items-center justify-between rounded px-2 py-2 text-left transition-colors hover:bg-gray-100"
							>
								<span class="flex items-center gap-2 text-sm font-medium text-gray-700">
									{#if item.icon === 'tree'}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M3 3h4v4H3zM13 7h4v4h-4zM13 17h4v4h-4z" />
											<path d="M5 7v6h8M5 13h8v4" />
										</svg>
									{:else if item.icon === 'properties'}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
											<polyline points="14 2 14 8 20 8" />
											<line x1="16" y1="13" x2="8" y2="13" />
											<line x1="16" y1="17" x2="8" y2="17" />
										</svg>
									{:else if item.icon === 'measure'}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path
												d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"
											/>
											<path d="m14.5 12.5 2-2" />
											<path d="m11.5 9.5 2-2" />
											<path d="m8.5 6.5 2-2" />
											<path d="m17.5 15.5 2-2" />
										</svg>
									{/if}
									{item.title}
								</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4 text-gray-400 transition-transform {expandedHelpItems.has(item.id)
										? 'rotate-180'
										: ''}"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<polyline points="6 9 12 15 18 9" />
								</svg>
							</button>
							{#if expandedHelpItems.has(item.id)}
								<p class="px-2 pb-2 pl-8 text-sm text-gray-500">{item.content}</p>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Measure Panel -->
		<div class="flex h-full w-96 flex-col {activePanel === 'measure' ? '' : 'hidden'}">
			<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
				<h2 class="font-semibold text-gray-900">Measure</h2>
				<button
					onclick={() => togglePanel('measure')}
					class="cursor-pointer rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
					aria-label="Close panel"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<div class="flex-1 overflow-y-auto p-4">
				<p class="mb-4 text-sm text-gray-500">
					Double-click on the model to place a point. Double-click again to complete the
					measurement.
				</p>

				<!-- Measurements list -->
				{#if measurements.length > 0}
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<h3 class="text-sm font-medium text-gray-700">Measurements</h3>
							<button
								onclick={onClearMeasurements}
								class="text-xs text-gray-500 hover:text-red-600"
							>
								Clear all
							</button>
						</div>
						{#each measurements as measurement, index}
							<div class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
								<div class="flex items-center gap-2">
									<span
										class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-800"
									>
										{index + 1}
									</span>
									<span class="text-sm font-medium text-gray-900"
										>{measurement.formattedDistance}</span
									>
								</div>
								<button
									onclick={() => onDeleteMeasurement(measurement.id)}
									class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-600"
									aria-label="Delete measurement"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<line x1="18" y1="6" x2="6" y2="18" />
										<line x1="6" y1="6" x2="18" y2="18" />
									</svg>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Settings Panel -->
		<div class="flex h-full w-96 flex-col {activePanel === 'settings' ? '' : 'hidden'}">
			<div class="flex h-14 items-center justify-between border-b border-gray-200 px-4">
				<h2 class="font-semibold text-gray-900">Settings</h2>
				<button
					onclick={() => togglePanel('settings')}
					class="cursor-pointer rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
					aria-label="Close panel"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<div class="flex-1 overflow-y-auto p-4">
				<!-- Unit System Setting -->
				<div class="space-y-4">
					<div>
						<h3 class="mb-2 text-sm font-medium text-gray-700">Unit System</h3>
						<p class="mb-3 text-xs text-gray-500">Choose how measurements are displayed</p>
						<div class="flex gap-2">
							<button
								onclick={() => onUnitSystemChange('metric')}
								class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors {unitSystem ===
								'metric'
									? 'bg-blue-600 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
							>
								Metric
							</button>
							<button
								onclick={() => onUnitSystemChange('imperial')}
								class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors {unitSystem ===
								'imperial'
									? 'bg-blue-600 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
							>
								Imperial
							</button>
						</div>
						<p class="mt-2 text-xs text-gray-400">
							{unitSystem === 'metric' ? 'Meters (m)' : 'Feet and inches (ft-in)'}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
