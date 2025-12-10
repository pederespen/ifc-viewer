<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import * as OBC from '@thatopen/components';
	import * as OBCF from '@thatopen/components-front';
	import SidePanel from './SidePanel.svelte';
	import ViewerHeader from './ViewerHeader.svelte';
	import CompassWidget from './CompassWidget.svelte';
	import LoadingOverlay from './LoadingOverlay.svelte';
	import ErrorNotification from './ErrorNotification.svelte';
	import DropZone from './DropZone.svelte';
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
	<ViewerHeader {currentFileName} />

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
				<DropZone {isDragging} onTriggerFileInput={triggerFileInput} />
			{/if}

			{#if isLoading}
				<LoadingOverlay />
			{/if}

			<!-- Compass -->
			{#if hasModel}
				<CompassWidget {compassAxes} onRecenter={handleRecenterView} onReset={handleResetView} />
			{/if}

			{#if error}
				<ErrorNotification {error} onClose={() => (error = null)} />
			{/if}
		</div>
	</div>
</div>
