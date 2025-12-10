<script lang="ts">
	/* eslint-disable no-unused-vars */
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import * as OBC from '@thatopen/components';
	import * as OBCF from '@thatopen/components-front';
	import SidePanel from './SidePanel.svelte';
	import { buildIFCTree, collectExpressIDs, type TreeNode } from '$lib/utils/ifcTreeBuilder';

	let container: HTMLDivElement;
	let components: OBC.Components | null = null;
	let world: OBC.World | null = null;
	let isDragging = $state(false);
	let hasModel = $state(false);
	let isLoading = $state(false);
	let error: string | null = $state(null);
	let selectedElement: any = $state(null);
	let currentModel: any = null;
	let currentFileName = $state<string>('');
	let ifcTree: TreeNode[] = $state([]);
	let hiddenExpressIDs = $state(new Set<number>());
	let compassAxes = $state({
		x: { x: 20, y: 0, z: 0 },
		y: { x: 0, y: -20, z: 0 },
		z: { x: 14, y: 14, z: 0 }
	});
	let initialCameraPosition: THREE.Vector3 | null = null;
	let initialCameraTarget: THREE.Vector3 | null = null;

	onMount(() => {
		initViewer();
	});

	onDestroy(() => {
		if (components) {
			components.dispose();
		}
	});

	async function initViewer() {
		components = new OBC.Components();

		const worlds = components.get(OBC.Worlds);

		world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();

		world.scene = new OBC.SimpleScene(components);
		// Setup scene with custom lighting config for better material colors
		(
			world.scene as OBC.SimpleScene & {
				setup: (config?: {
					backgroundColor?: THREE.Color;
					directionalLight?: { color?: THREE.Color; intensity?: number; position?: THREE.Vector3 };
					ambientLight?: { color?: THREE.Color; intensity?: number };
				}) => void;
			}
		).setup({
			backgroundColor: new THREE.Color('#ffffff'),
			directionalLight: {
				intensity: 1.5,
				position: new THREE.Vector3(5, 10, 3)
			},
			ambientLight: {
				intensity: 1.0
			}
		});

		world.renderer = new OBC.SimpleRenderer(components, container);

		world.camera = new OBC.SimpleCamera(components);

		// Update camera aspect ratio on resize to prevent squishing
		world.renderer.onResize.add((size: THREE.Vector2) => {
			const camera = world!.camera.three as THREE.PerspectiveCamera;
			if (camera.isPerspectiveCamera) {
				camera.aspect = size.x / size.y;
				camera.updateProjectionMatrix();
			}
		});

		components.init();

		// Update compass rotation when camera moves
		world.camera.controls?.addEventListener('update', () => {
			updateCompassRotation();
		});

		// Get fragments manager
		const fragments = components.get(OBC.FragmentsManager) as unknown as {
			init?: (url: string) => void;
			list?: {
				onItemSet?: {
					add?: (handler: (event: { value: unknown }) => void) => void;
				};
			};
			core?: {
				update?: (force: boolean) => void;
			};
		};

		// Fetch and initialize fragments worker
		try {
			const githubUrl = 'https://thatopen.github.io/engine_fragment/resources/worker.mjs';
			const fetchedUrl = await fetch(githubUrl);
			const workerBlob = await fetchedUrl.blob();
			const workerFile = new File([workerBlob], 'worker.mjs', {
				type: 'text/javascript'
			});
			const workerUrl = URL.createObjectURL(workerFile);
			fragments.init?.(workerUrl);
		} catch (err) {
			// Silently handle worker initialization error
		}

		// Set up event handler for when models are loaded
		fragments.list?.onItemSet?.add?.((event: { value: unknown }) => {
			const typedModel = event.value as {
				useCamera?: (camera: unknown) => void;
				object?: THREE.Object3D;
			};

			typedModel.useCamera?.(world!.camera.three);

			if (typedModel.object) {
				world!.scene.three.add(typedModel.object);
			}

			fragments.core?.update?.(true);
		});

		// Update fragments when camera stops moving
		world.camera.controls?.addEventListener('rest', () => {
			fragments.core?.update?.(true);
		});

		// Setup IFC loader with specific WASM configuration
		const ifcLoader = components.get(OBC.IfcLoader) as unknown as {
			setup?: (config?: {
				autoSetWasm?: boolean;
				wasm?: {
					path: string;
					absolute: boolean;
				};
			}) => Promise<void>;
			load?: (
				data: Uint8Array,
				streaming: boolean,
				name: string
			) => Promise<{
				object?: THREE.Object3D;
			}>;
		};

		await ifcLoader.setup?.({
			autoSetWasm: false,
			wasm: {
				path: 'https://unpkg.com/web-ifc@0.0.69/',
				absolute: true
			}
		});

		// Setup highlighter for selection effects
		const highlighter = components.get(OBCF.Highlighter);

		// Disable default click-to-select behavior (we'll use double-click instead)
		highlighter.setup({ world, selectEnabled: false });

		// Configure colors and settings
		highlighter.zoomToSelection = false;

		// Configure selection style for model double-click - solid orange
		highlighter.styles.set('select', {
			color: new THREE.Color(0xf59e0b), // Amber/orange
			opacity: 1,
			transparent: false,
			renderedFaces: 0
		});

		// Configure tree selection style - transparent x-ray for seeing through
		highlighter.styles.set('treeSelect', {
			color: new THREE.Color(0x3b82f6), // Blue
			opacity: 0.4,
			transparent: true,
			depthTest: false, // Render on top for x-ray effect
			renderedFaces: 1
		});

		// Setup hover style for instant highlighting - light blue
		highlighter.styles.set('hover', {
			color: new THREE.Color(0x93c5fd), // Light blue
			opacity: 1,
			transparent: false,
			renderedFaces: 0
		}); // Custom instant hover - bypasses Hoverer's 50ms debounce
		const rendererEl = world.renderer?.three.domElement;
		if (rendererEl) {
			rendererEl.addEventListener('pointermove', () => {
				// Fire and forget - no await to avoid blocking
				highlighter.highlight('hover', true, false).catch(() => {});
			});

			// Double-click to select (clear tree selection first)
			rendererEl.addEventListener('dblclick', () => {
				highlighter.clear('treeSelect');
				highlighter.highlight('select', true, false).catch(() => {});
			});
		}

		// Setup selection event listener
		(highlighter as any).events.select.onHighlight.add(async (modelIdMap: any) => {
			if (!currentModel || !modelIdMap || Object.keys(modelIdMap).length === 0) {
				return;
			}

			try {
				// The structure is: { modelName: Set<fragmentID> }
				const modelID = Object.keys(modelIdMap)[0];
				const fragmentIdsSet = modelIdMap[modelID];

				if (fragmentIdsSet instanceof Set && fragmentIdsSet.size > 0) {
					const fragmentID = Array.from(fragmentIdsSet)[0];

					// Get the fragment group and fetch IFC properties
					const fragments = components!.get(OBC.FragmentsManager);
					const fragmentGroup = (fragments as any).list?.get?.(modelID);

					if (fragmentGroup && typeof (fragmentGroup as any).getItemsData === 'function') {
						const itemsData = await (fragmentGroup as any).getItemsData([fragmentID]);

						if (itemsData && itemsData.length > 0) {
							selectedElement = {
								ExpressID: fragmentID,
								...itemsData[0]
							};
						} else {
							selectedElement = {
								ExpressID: fragmentID,
								ModelID: modelID,
								Name: 'IFC Element'
							};
						}
					} else {
						selectedElement = {
							ExpressID: fragmentID,
							Name: 'Selected Element',
							ModelID: modelID
						};
					}
				}
			} catch (err) {
				// Silently handle selection errors
			}
		});
	}

	function updateCompassRotation() {
		if (!world?.camera?.three) return;

		const camera = world.camera.three;

		// Ensure matrix is up to date
		camera.updateMatrixWorld();

		// Get camera's rotation as a quaternion
		const quaternion = new THREE.Quaternion();
		camera.getWorldQuaternion(quaternion);

		// Define world axes
		const xAxis = new THREE.Vector3(1, 0, 0);
		const yAxis = new THREE.Vector3(0, 1, 0);
		const zAxis = new THREE.Vector3(0, 0, 1);

		// Apply inverse camera rotation to get axes in view space
		const inverseQuat = quaternion.clone().invert();
		xAxis.applyQuaternion(inverseQuat);
		yAxis.applyQuaternion(inverseQuat);
		zAxis.applyQuaternion(inverseQuat);

		// Project to 2D screen space (x stays x, y stays y, z for depth)
		const scale = 32;
		compassAxes = {
			x: { x: xAxis.x * scale, y: -xAxis.y * scale, z: xAxis.z },
			y: { x: yAxis.x * scale, y: -yAxis.y * scale, z: yAxis.z },
			z: { x: zAxis.x * scale, y: -zAxis.y * scale, z: zAxis.z }
		};
	}

	function resetView() {
		if (!world?.camera?.controls) return;
		if (!initialCameraPosition || !initialCameraTarget) {
			console.warn('Reset view: initial camera position not set');
			return;
		}

		world.camera.controls.setLookAt(
			initialCameraPosition.x,
			initialCameraPosition.y,
			initialCameraPosition.z,
			initialCameraTarget.x,
			initialCameraTarget.y,
			initialCameraTarget.z,
			false // no animation
		);

		// Update compass immediately
		updateCompassRotation();
	}

	function recenterView() {
		if (!world?.camera?.controls) return;
		if (!initialCameraTarget || !initialCameraPosition) {
			console.warn('Recenter view: initial camera target not set');
			return;
		}

		// Get current camera direction (but use initial distance for proper zoom)
		const currentPosition = new THREE.Vector3();
		const currentTarget = new THREE.Vector3();
		world.camera.controls.getPosition(currentPosition);
		world.camera.controls.getTarget(currentTarget);

		// Calculate current direction from target
		const direction = new THREE.Vector3().subVectors(currentPosition, currentTarget).normalize();

		// Use the initial distance (proper zoom level)
		const initialDistance = initialCameraPosition.clone().sub(initialCameraTarget).length();

		// Apply current direction but with initial distance to model center
		const newPosition = initialCameraTarget.clone().add(direction.multiplyScalar(initialDistance));

		world.camera.controls.setLookAt(
			newPosition.x,
			newPosition.y,
			newPosition.z,
			initialCameraTarget.x,
			initialCameraTarget.y,
			initialCameraTarget.z,
			false // no animation
		);

		// Update compass immediately
		updateCompassRotation();
	}

	async function fitCameraToModel(): Promise<boolean> {
		if (!world) return false;

		try {
			const bbox = new THREE.Box3();
			let foundObjects = false;

			// Try to get bounding box from fragments manager
			if (components) {
				const fragments = components.get(OBC.FragmentsManager);
				for (const [, fragmentGroup] of (fragments as any).list) {
					if (fragmentGroup?.object) {
						const groupBox = new THREE.Box3().setFromObject(fragmentGroup.object);
						bbox.union(groupBox);
						foundObjects = true;
					}
				}
			}

			// Fallback: try to get bounding box from currentModel directly
			if (!foundObjects && currentModel?.object) {
				bbox.setFromObject(currentModel.object);
				foundObjects = true;
			}

			// Fallback: try to get bounding box from scene children
			if (!foundObjects) {
				world.scene.three.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						const meshBox = new THREE.Box3().setFromObject(child);
						bbox.union(meshBox);
						foundObjects = true;
					}
				});
			}

			if (bbox.isEmpty() || !foundObjects) {
				console.warn('fitCameraToModel: No objects found to fit, will retry...');
				return false;
			}

			// Calculate center and size
			const center = new THREE.Vector3();
			const size = new THREE.Vector3();
			bbox.getCenter(center);
			bbox.getSize(size);

			// Calculate distance to fit the model in view
			const maxDim = Math.max(size.x, size.y, size.z);
			const camera = world.camera.three as THREE.PerspectiveCamera;
			const fov = camera.fov * (Math.PI / 180);
			const distance = (maxDim / (2 * Math.tan(fov / 2))) * 1.5; // 1.5x padding

			// Position camera at a nice angle
			const offset = new THREE.Vector3(distance * 0.7, distance * 0.5, distance * 0.7);
			const cameraPos = center.clone().add(offset);

			// Store initial position for reset view
			initialCameraPosition = cameraPos.clone();
			initialCameraTarget = center.clone();

			// Set camera position immediately (no animation)
			world.camera.controls?.setLookAt(
				cameraPos.x,
				cameraPos.y,
				cameraPos.z,
				center.x,
				center.y,
				center.z,
				false // no animation
			);

			// Update compass after camera move (with small delay to ensure camera matrix is updated)
			setTimeout(() => updateCompassRotation(), 50);

			console.log('Camera fitted to model successfully');
			return true;
		} catch (err) {
			console.error('Error fitting camera to model:', err);
			return false;
		}
	}

	async function handleFiles(files: FileList) {
		const file = files[0];
		if (!file || !file.name.toLowerCase().endsWith('.ifc')) {
			error = 'Please select a valid IFC file';
			setTimeout(() => (error = null), 5000);
			return;
		}

		if (!components || !world) return;

		isLoading = true;
		error = null;

		try {
			// Clear previous model if any
			if (hasModel) {
				world.scene.three.clear();
				// Re-add lights
				const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
				world.scene.three.add(ambientLight);
				const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
				directionalLight.position.set(5, 10, 5);
				world.scene.three.add(directionalLight);
			}

			const data = await file.arrayBuffer();
			const buffer = new Uint8Array(data);

			const fragmentIfcLoader = components.get(OBC.IfcLoader) as unknown as {
				load?: (
					data: Uint8Array,
					streaming: boolean,
					name: string
				) => Promise<{
					object?: THREE.Object3D;
				}>;
			};

			// Yield control to allow UI to update
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Load IFC file - the model will be added to scene automatically via fragments event handler
			const model = await fragmentIfcLoader.load?.(buffer, false, file.name);

			if (model?.object) {
				world.scene.three.add(model.object);
			}

			currentModel = model;
			currentFileName = file.name;
			hasModel = true;
			selectedElement = null; // Reset selection when loading new model

			// Fit camera to model with retry (model geometry may take time to process)
			let retryCount = 0;
			const maxRetries = 10;
			const tryFitCamera = async () => {
				const success = await fitCameraToModel();
				if (!success && retryCount < maxRetries) {
					retryCount++;
					setTimeout(tryFitCamera, 200);
				}
			};
			// Wait a bit for geometry to be available, then try fitting camera
			setTimeout(tryFitCamera, 300);

			// Build IFC tree structure
			setTimeout(async () => {
				ifcTree = await buildIFCTree(components, currentModel);
			}, 500); // Give time for fragments to be processed
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load IFC file. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFiles(files);
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
		if (input.files && input.files.length > 0) {
			handleFiles(input.files);
		}
	}

	function triggerFileInput() {
		const input = document.getElementById('file-input') as HTMLInputElement;
		input?.click();
	}

	function handleClearSelection() {
		const highlighter = components?.get(OBCF.Highlighter);
		if (highlighter) {
			highlighter.clear('select');
			highlighter.clear('treeSelect');
		}
		selectedElement = null;
	}

	function handleTreeItemClick(item: TreeNode) {
		if (item.expressID && currentModel) {
			// Highlight the element in the viewer
			const highlighter = components?.get(OBCF.Highlighter);
			if (highlighter) {
				try {
					// Clear previous selections
					highlighter.clear('select');
					highlighter.clear('treeSelect');

					// Select the new element with tree style (x-ray)
					const modelName = Object.keys((components!.get(OBC.FragmentsManager) as any).list)[0];
					const modelIdMap = { [modelName]: new Set([item.expressID]) };
					highlighter.highlightByID('treeSelect', modelIdMap, true, false);

					// The selection event handler will automatically open the properties section
				} catch (err) {
					// Silently handle error
				}
			}
		}
	}

	function handleTreeItemHover(item: TreeNode | null) {
		if (!components || !currentModel) return;

		const highlighter = components.get(OBCF.Highlighter);
		if (!highlighter) return;

		try {
			// Clear hover highlight
			highlighter.clear('hover');

			if (item) {
				// Collect all expressIDs from this node and its children
				const ids = collectExpressIDs(item);
				if (ids.length > 0) {
					// Get the model name from fragments list
					const fragments = components.get(OBC.FragmentsManager);
					const fragmentsList = (fragments as any).list;
					const modelName = fragmentsList?.keys().next().value;

					if (modelName) {
						// ModelIdMap is Record<string, Set<number>>
						const modelIdMap: OBC.ModelIdMap = {
							[modelName]: new Set(ids)
						};
						highlighter.highlightByID('hover', modelIdMap, true, false);
					}
				}
			}
		} catch (err) {
			console.error('Error highlighting:', err);
		}
	}

	function updateNodeVisibility(node: TreeNode, visible: boolean) {
		node.visible = visible;
		for (const child of node.children) {
			updateNodeVisibility(child, visible);
		}
	}

	function handleVisibilityToggle(item: TreeNode) {
		if (!components || !currentModel) return;

		const newVisible = !item.visible;

		// Update the node and all children
		updateNodeVisibility(item, newVisible);

		// Force reactivity by creating a new array reference
		ifcTree = [...ifcTree];

		// Collect all expressIDs from this node and children
		const ids = collectExpressIDs(item);

		// Update hidden set
		const newHiddenSet = new Set(hiddenExpressIDs);
		for (const id of ids) {
			if (newVisible) {
				newHiddenSet.delete(id);
			} else {
				newHiddenSet.add(id);
			}
		}
		hiddenExpressIDs = newHiddenSet;

		// Apply visibility to the model using fragments API
		applyVisibilityToFragments(ids, newVisible);
	}

	function applyVisibilityToFragments(expressIDs: number[], visible: boolean) {
		if (!components) return;

		try {
			const fragments = components.get(OBC.FragmentsManager);
			const fragmentsList = (fragments as any).list;

			if (!fragmentsList || fragmentsList.size === 0) return;

			for (const [, fragmentGroup] of fragmentsList) {
				// Use setVisible method - signature: setVisible(localIds: number[] | undefined, visible: boolean)
				if (typeof fragmentGroup.setVisible === 'function') {
					fragmentGroup.setVisible(expressIDs, visible);
				}
			}
		} catch (err) {
			console.error('Error setting visibility:', err);
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

	<!-- Main Content Area -->
	<div class="relative flex flex-1 overflow-hidden">
		<!-- Side Panel Component -->
		<SidePanel
			tree={ifcTree}
			{hasModel}
			{selectedElement}
			onTreeItemClick={handleTreeItemClick}
			onTreeItemHover={handleTreeItemHover}
			onVisibilityToggle={handleVisibilityToggle}
			onClearSelection={handleClearSelection}
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
							class="transition-all"
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

			<!-- Compass and Reset View Controls -->
			{#if hasModel}
				{@const axes = [
					{ axis: 'x', color: '#ef4444', data: compassAxes.x },
					{ axis: 'y', color: '#22c55e', data: compassAxes.y },
					{ axis: 'z', color: '#3b82f6', data: compassAxes.z }
				].sort((a, b) => a.data.z - b.data.z)}
				<div
					class="absolute right-4 bottom-4 z-10 flex flex-col items-center overflow-hidden rounded-xl border border-gray-200 bg-white/90 shadow-lg backdrop-blur-sm"
				>
					<!-- 3D Axis Compass -->
					<div class="p-2">
						<svg class="h-28 w-28" viewBox="-44 -44 88 88">
							<!-- Subtle background circle -->
							<circle cx="0" cy="0" r="40" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />

							<!-- Draw axes back-to-front for proper depth -->
							{#each axes as { axis, color, data }}
								{@const opacity = 0.5 + (data.z + 1) * 0.25}
								{@const strokeWidth = 2.5 + (data.z + 1) * 0.5}
								<!-- Axis line shadow for depth -->
								<line
									x1="1"
									y1="1"
									x2={data.x + 1}
									y2={data.y + 1}
									stroke="rgba(0,0,0,0.15)"
									stroke-width={strokeWidth + 1}
									stroke-linecap="round"
								/>
								<!-- Axis line -->
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
								<!-- Circle shadow -->
								<circle
									cx={data.x + 1}
									cy={data.y + 1}
									r={8 + (data.z + 1) * 1}
									fill="rgba(0,0,0,0.15)"
								/>
								<!-- Axis end circle -->
								<circle cx={data.x} cy={data.y} r={8 + (data.z + 1) * 1} fill={color} {opacity} />
								<!-- Axis label -->
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

							<!-- Center point (on top) -->
							<circle cx="0" cy="0" r="4" fill="#374151" stroke="white" stroke-width="1" />
						</svg>
					</div>

					<!-- Separator -->
					<div class="h-px w-full bg-gray-200"></div>

					<!-- Button Row -->
					<div class="flex w-full">
						<!-- Recenter Button (keeps rotation) -->
						<button
							onclick={recenterView}
							class="flex flex-1 items-center justify-center border-r border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-100"
							title="Recenter (keep rotation)"
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
								<!-- Focus/target square corners -->
								<path d="M2 8V2h6" />
								<path d="M22 8V2h-6" />
								<path d="M2 16v6h6" />
								<path d="M22 16v6h-6" />
								<!-- Center dot -->
								<circle cx="12" cy="12" r="2" fill="currentColor" />
							</svg>
						</button>

						<!-- Reset View Button (full reset) -->
						<button
							onclick={resetView}
							class="flex flex-1 items-center justify-center px-3 py-2.5 transition-colors hover:bg-gray-100"
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
								class="flex-shrink-0 text-red-400 transition-colors hover:text-red-600"
								aria-label="Close error"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
