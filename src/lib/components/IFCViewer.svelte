<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import * as OBC from '@thatopen/components';
	import * as OBCF from '@thatopen/components-front';
	import SidePanel from './SidePanel.svelte';
	import { buildIFCTree, collectExpressIDs, type TreeNode } from '$lib/utils/ifcTreeBuilder';
	import {
		setupHighlighter,
		clearSelection,
		clearHoverHighlight,
		highlightByID,
		getFirstModelName
	} from '$lib/utils/highlighter';
	import {
		calculateCompassAxes,
		resetView,
		recenterView,
		fitCameraToModel,
		type CameraState
	} from '$lib/utils/camera';
	import { MeasurementTool, type MeasurementData, type UnitSystem } from '$lib/utils/measurement';
	import { SlicerTool, type SliceData } from '$lib/utils/slicer';
	import type { FragmentGroup, IFCLoader, SelectedElement, CompassAxes } from '$lib/types/viewer';
	import { FragmentsHelper } from '$lib/utils/fragments';
	import { COLORS } from '$lib/constants/colors';
	import { LIGHT_INTENSITY } from '$lib/constants/sizes';

	// State
	let container: HTMLDivElement;
	let components: OBC.Components | null = null;
	let world: OBC.World | null = null;
	let currentModel: FragmentGroup | null = null;
	let cameraState: CameraState = { initialPosition: null, initialTarget: null };
	let measurementTool: MeasurementTool | null = null;
	let slicerTool: SlicerTool | null = null;

	// Reactive state
	let isDragging = $state(false);
	let hasModel = $state(false);
	let isLoading = $state(false);
	let error: string | null = $state(null);
	let selectedElement: SelectedElement | null = $state(null);
	let currentFileName = $state('');
	let ifcTree: TreeNode[] = $state([]);
	let measurementEnabled = $state(false);
	let measurements: MeasurementData[] = $state([]);
	let unitSystem: UnitSystem = $state('metric');
	let slicerEnabled = $state(false);
	let slices: SliceData[] = $state([]);
	let compassAxes: CompassAxes = $state({
		x: { x: 20, y: 0, z: 0 },
		y: { x: 0, y: -20, z: 0 },
		z: { x: 14, y: 14, z: 0 }
	});

	onMount(() => {
		initViewer();
	});

	onDestroy(() => {
		measurementTool?.dispose();
		slicerTool?.dispose();
		components?.dispose();
	});

	async function initViewer() {
		components = new OBC.Components();
		const worlds = components.get(OBC.Worlds);
		world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();

		// Setup scene
		world.scene = new OBC.SimpleScene(components);
		(world.scene as OBC.SimpleScene & { setup: (_config?: Record<string, unknown>) => void }).setup(
			{
				backgroundColor: new THREE.Color(COLORS.background),
				directionalLight: {
					intensity: LIGHT_INTENSITY.directional,
					position: new THREE.Vector3(5, 10, 3)
				},
				ambientLight: { intensity: LIGHT_INTENSITY.ambient }
			}
		);

		// Setup renderer and camera
		world.renderer = new OBC.SimpleRenderer(components, container);
		world.camera = new OBC.SimpleCamera(components);

		// Handle resize
		world.renderer.onResize.add((size: THREE.Vector2) => {
			const camera = world!.camera.three as THREE.PerspectiveCamera;
			if (camera.isPerspectiveCamera) {
				camera.aspect = size.x / size.y;
				camera.updateProjectionMatrix();
			}
		});

		components.init();

		// Update compass on camera movement
		world.camera.controls?.addEventListener('update', updateCompass);

		// Setup fragments
		await setupFragments();

		// Setup IFC loader
		await setupIfcLoader();

		// Setup highlighter
		setupHighlighter(
			components,
			world,
			(element) => {
				selectedElement = element;
			},
			() => (measurementTool?.isEnabled || slicerTool?.isEnabled) ?? false
		);

		// Setup measurement tool
		measurementTool = new MeasurementTool(components, world);
		measurementTool.onEnabledChange = (enabled) => {
			measurementEnabled = enabled;
		};
		measurementTool.onMeasurementsChange = (newMeasurements) => {
			measurements = newMeasurements;
		};

		// Setup slicer tool
		slicerTool = new SlicerTool(components, world);
		slicerTool.onEnabledChange = (enabled) => {
			slicerEnabled = enabled;
		};
		slicerTool.onSlicesChange = (newSlices) => {
			slices = newSlices;
		};

		// Update measurement labels on camera update
		world.camera.controls?.addEventListener('update', () => {
			measurementTool?.updateLabels();
		});

		// Add measurement event listeners
		const rendererEl = world.renderer?.three.domElement;
		if (rendererEl) {
			rendererEl.addEventListener('pointermove', handleMeasurementPointerMove);
			rendererEl.addEventListener('dblclick', handleToolsDoubleClick);
		}
	}

	function handleMeasurementPointerMove(event: MouseEvent) {
		measurementTool?.handlePointerMove(event);
	}

	async function handleToolsDoubleClick(event: MouseEvent) {
		// Handle measurement tool double click
		if (measurementTool?.isEnabled) {
			const handled = await measurementTool.handleDoubleClick(event);
			if (handled) {
				event.stopPropagation();
				return;
			}
		}
		// Handle slicer tool double click
		if (slicerTool?.isEnabled) {
			const handled = await slicerTool.handleDoubleClick();
			if (handled) {
				event.stopPropagation();
				return;
			}
		}
	}

	function handleMeasurementToggle() {
		measurementTool?.toggle();
		// Disable slicer when enabling measurement
		if (measurementTool?.isEnabled) {
			slicerTool?.disable();
			if (components) {
				clearHoverHighlight(components);
			}
		}
	}

	function handleSlicerToggle() {
		slicerTool?.toggle();
		// Disable measurement when enabling slicer
		if (slicerTool?.isEnabled) {
			measurementTool?.disable();
			if (components) {
				clearHoverHighlight(components);
			}
		}
	}

	function handleDeleteSlice(id: string) {
		slicerTool?.deleteSlice(id);
	}

	function handleClearSlices() {
		slicerTool?.clearAllSlices();
	}

	function handleDeleteMeasurement(id: number) {
		measurementTool?.deleteMeasurement(id);
	}

	function handleClearMeasurements() {
		measurementTool?.clearAllMeasurements();
	}

	function handleUnitSystemChange(newUnitSystem: UnitSystem) {
		unitSystem = newUnitSystem;
		if (measurementTool) {
			measurementTool.unitSystem = newUnitSystem;
		}
	}

	async function setupFragments() {
		if (!components || !world) return;

		const fragments = FragmentsHelper.get(components);

		// Initialize worker
		try {
			const response = await fetch(
				'https://thatopen.github.io/engine_fragment/resources/worker.mjs'
			);
			const blob = await response.blob();
			const workerUrl = URL.createObjectURL(
				new File([blob], 'worker.mjs', { type: 'text/javascript' })
			);
			fragments.init?.(workerUrl);
		} catch {
			// Worker init failed, continue without it
		}

		// Handle model loading
		const list = fragments.list as unknown as {
			onItemSet?: { add?: (_fn: (_e: { value: FragmentGroup }) => void) => void };
		};
		list.onItemSet?.add?.((event) => {
			const model = event.value;
			model.useCamera?.(world!.camera.three);
			if (model.object) {
				world!.scene.three.add(model.object);
			}
			FragmentsHelper.updateCore(components!);
		});

		// Update fragments on camera rest
		world.camera.controls?.addEventListener('rest', () => {
			FragmentsHelper.updateCore(components!);
		});
	}

	async function setupIfcLoader() {
		if (!components) return;

		const ifcLoader = components.get(OBC.IfcLoader) as unknown as IFCLoader;
		await ifcLoader.setup?.({
			autoSetWasm: false,
			wasm: { path: 'https://unpkg.com/web-ifc@0.0.69/', absolute: true }
		});
	}

	function updateCompass() {
		if (!world?.camera?.three) return;
		compassAxes = calculateCompassAxes(world.camera.three);
	}

	function handleResetView() {
		if (!world) return;
		resetView(world, cameraState, updateCompass);
	}

	function handleRecenterView() {
		if (!world) return;
		recenterView(world, cameraState, updateCompass);
	}

	async function handleFiles(files: FileList) {
		const file = files[0];
		if (!file?.name.toLowerCase().endsWith('.ifc')) {
			error = 'Please select a valid IFC file';
			setTimeout(() => (error = null), 5000);
			return;
		}

		if (!components || !world) return;

		isLoading = true;
		error = null;

		try {
			// Clear previous model
			if (hasModel) {
				world.scene.three.clear();
				world.scene.three.add(new THREE.AmbientLight(0xffffff, 0.5));
				const dirLight = new THREE.DirectionalLight(0xffffff, 1);
				dirLight.position.set(5, 10, 5);
				world.scene.three.add(dirLight);
			}

			const data = await file.arrayBuffer();
			const ifcLoader = components.get(OBC.IfcLoader) as unknown as IFCLoader;

			await new Promise((resolve) => setTimeout(resolve, 100)); // Let UI update

			const model = await ifcLoader.load?.(new Uint8Array(data), false, file.name);
			if (model?.object) {
				world.scene.three.add(model.object);
			}

			currentModel = model as FragmentGroup;
			currentFileName = file.name;
			hasModel = true;
			selectedElement = null;

			// Fit camera with retry
			let retryCount = 0;
			const tryFit = async () => {
				const state = await fitCameraToModel(world!, components!, currentModel);
				if (state) {
					cameraState = state;
					setTimeout(updateCompass, 50);
				} else if (retryCount++ < 10) {
					setTimeout(tryFit, 200);
				}
			};
			setTimeout(tryFit, 300);

			// Build tree
			setTimeout(async () => {
				ifcTree = await buildIFCTree(components, currentModel);
			}, 500);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load IFC file';
		} finally {
			isLoading = false;
		}
	}

	// Event handlers
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		if (event.dataTransfer?.files.length) {
			handleFiles(event.dataTransfer.files);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleFileInput(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files?.length) {
			handleFiles(input.files);
		}
	}

	function triggerFileInput() {
		(document.getElementById('file-input') as HTMLInputElement)?.click();
	}

	function handleClearSelection() {
		if (components) {
			clearSelection(components);
		}
		selectedElement = null;
	}

	function handleTreeItemClick(item: TreeNode) {
		if (!item.expressID || !currentModel || !components) return;

		const highlighter = components.get(OBCF.Highlighter);
		highlighter.clear('select');
		highlighter.clear('treeSelect');

		const modelName = getFirstModelName(components);
		if (modelName) {
			highlightByID(components, 'treeSelect', { [modelName]: new Set([item.expressID]) });
		}
	}

	function handleTreeItemHover(item: TreeNode | null) {
		if (!components || !currentModel) return;

		const highlighter = components.get(OBCF.Highlighter);
		highlighter.clear('treeHover');

		if (item) {
			const ids = collectExpressIDs(item);
			const modelName = getFirstModelName(components);
			if (ids.length && modelName) {
				highlightByID(components, 'treeHover', { [modelName]: new Set(ids) });
			}
		}
	}

	function updateNodeVisibility(node: TreeNode, visible: boolean) {
		node.visible = visible;
		node.children.forEach((child) => updateNodeVisibility(child, visible));
	}

	function handleVisibilityToggle(item: TreeNode) {
		if (!components || !currentModel) return;

		const newVisible = !item.visible;
		updateNodeVisibility(item, newVisible);
		ifcTree = [...ifcTree]; // Trigger reactivity

		const ids = collectExpressIDs(item);

		for (const { group } of FragmentsHelper.iterateGroups(components)) {
			group.setVisible?.(ids, newVisible);
		}
	}
</script>

<div class="relative flex h-full w-full flex-col">
	<!-- Header -->
	<div
		class="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm"
	>
		<div class="flex items-center gap-3">
			<button
				class="relative cursor-pointer text-2xl font-semibold text-gray-900 transition-colors hover:text-blue-600"
				onclick={() => window.location.reload()}
			>
				IFC Viewer
				<span class="align-super text-xs font-normal text-gray-400 lowercase">beta</span>
			</button>
			{#if currentFileName}
				<span class="text-sm text-gray-600">•</span>
				<span class="text-sm text-gray-700">{currentFileName}</span>
			{/if}
		</div>
	</div>

	<input id="file-input" type="file" accept=".ifc" class="hidden" onchange={handleFileInput} />

	<!-- Main Content -->
	<div class="relative flex flex-1 overflow-hidden">
		<SidePanel
			tree={ifcTree}
			{hasModel}
			{selectedElement}
			onTreeItemClick={handleTreeItemClick}
			onTreeItemHover={handleTreeItemHover}
			onVisibilityToggle={handleVisibilityToggle}
			onClearSelection={handleClearSelection}
			{measurementEnabled}
			onMeasurementToggle={handleMeasurementToggle}
			{measurements}
			onDeleteMeasurement={handleDeleteMeasurement}
			onClearMeasurements={handleClearMeasurements}
			{unitSystem}
			onUnitSystemChange={handleUnitSystemChange}
			{slicerEnabled}
			onSlicerToggle={handleSlicerToggle}
			{slices}
			onDeleteSlice={handleDeleteSlice}
			onClearSlices={handleClearSlices}
		/>

		<!-- Viewer Area -->
		<div
			class="relative flex-1 overflow-hidden transition-all {isDragging ? 'bg-blue-50' : ''}"
			ondrop={handleDrop}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			role="button"
			tabindex="0"
		>
			<div bind:this={container} class="h-full w-full"></div>

			{#if !hasModel && !isLoading}
				<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div
						class="pointer-events-auto flex h-1/2 w-1/2 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-all {isDragging
							? 'border-blue-500 bg-blue-50 text-blue-600'
							: 'border-gray-300 text-gray-400 hover:border-gray-400 hover:bg-gray-50'}"
						onclick={triggerFileInput}
						onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerFileInput()}
						role="button"
						tabindex="0"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="64"
							height="64"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" y1="3" x2="12" y2="15" />
						</svg>
						<p class="text-lg font-medium">Drop your IFC file here</p>
						<p class="text-sm opacity-70">or click to browse</p>
					</div>
				</div>
			{/if}

			{#if isLoading}
				<div
					class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm"
				>
					<div
						class="h-16 w-16 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"
					></div>
					<p class="text-lg font-medium text-gray-900">Loading IFC file...</p>
					<p class="text-sm text-gray-500">This may take a moment</p>
				</div>
			{/if}

			<!-- Compass -->
			{#if hasModel}
				{@const axes = [
					{ axis: 'x', color: '#ef4444', data: compassAxes.x },
					{ axis: 'y', color: '#22c55e', data: compassAxes.y },
					{ axis: 'z', color: '#3b82f6', data: compassAxes.z }
				].sort((a, b) => a.data.z - b.data.z)}
				<div
					class="absolute right-4 bottom-4 z-10 flex flex-col items-center overflow-hidden rounded-xl border border-gray-200 bg-white/90 shadow-lg backdrop-blur-sm"
				>
					<div class="p-2">
						<svg class="h-28 w-28" viewBox="-44 -44 88 88">
							<circle cx="0" cy="0" r="40" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
							{#each axes as { axis, color, data }}
								{@const opacity = 0.5 + (data.z + 1) * 0.25}
								{@const strokeWidth = 2.5 + (data.z + 1) * 0.5}
								<line
									x1="1"
									y1="1"
									x2={data.x + 1}
									y2={data.y + 1}
									stroke="rgba(0,0,0,0.15)"
									stroke-width={strokeWidth + 1}
									stroke-linecap="round"
								/>
								<line
									x1="0"
									y1="0"
									x2={data.x}
									y2={data.y}
									stroke={color}
									stroke-width={strokeWidth}
									stroke-linecap="round"
									{opacity}
								/>
								<circle
									cx={data.x + 1}
									cy={data.y + 1}
									r={8 + (data.z + 1) * 1}
									fill="rgba(0,0,0,0.15)"
								/>
								<circle cx={data.x} cy={data.y} r={8 + (data.z + 1) * 1} fill={color} {opacity} />
								<text
									x={data.x}
									y={data.y}
									text-anchor="middle"
									dominant-baseline="central"
									fill="white"
									font-size={9 + (data.z + 1) * 0.5}
									font-weight="bold">{axis.toUpperCase()}</text
								>
							{/each}
							<circle cx="0" cy="0" r="4" fill="#374151" stroke="white" stroke-width="1" />
						</svg>
					</div>
					<div class="h-px w-full bg-gray-200"></div>
					<div class="flex w-full">
						<button
							onclick={handleRecenterView}
							class="flex flex-1 cursor-pointer items-center justify-center border-r border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-100"
							title="Recenter"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5 text-gray-600"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M2 8V2h6" /><path d="M22 8V2h-6" /><path d="M2 16v6h6" /><path
									d="M22 16v6h-6"
								/>
								<circle cx="12" cy="12" r="2" fill="currentColor" />
							</svg>
						</button>
						<button
							onclick={handleResetView}
							class="flex flex-1 cursor-pointer items-center justify-center px-3 py-2.5 transition-colors hover:bg-gray-100"
							title="Reset View"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5 text-gray-600"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
								<polyline points="9 22 9 12 15 12 15 22" />
							</svg>
						</button>
					</div>
				</div>
			{/if}

			{#if error}
				<div class="animate-fade-in absolute top-4 right-4 z-30 max-w-md">
					<div class="rounded-lg border border-red-200 bg-white p-4 shadow-lg">
						<div class="flex items-start gap-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5 flex-shrink-0 text-red-500"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<circle cx="12" cy="12" r="10" />
								<line x1="12" y1="8" x2="12" y2="12" />
								<line x1="12" y1="16" x2="12.01" y2="16" />
							</svg>
							<div class="flex-1">
								<h3 class="font-semibold text-red-800">Error Loading IFC File</h3>
								<p class="mt-1 text-sm text-red-700">{error}</p>
							</div>
							<button
								onclick={() => (error = null)}
								class="flex-shrink-0 cursor-pointer text-red-400 transition-colors hover:text-red-600"
								aria-label="Close"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
