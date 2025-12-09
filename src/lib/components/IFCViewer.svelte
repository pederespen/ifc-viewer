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
	let sidePanelOpen = $state(true);
	let ifcTree: TreeNode[] = $state([]);
	let sidePanelRef: any;
	let hiddenExpressIDs = $state(new Set<number>());

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
		(world.scene as OBC.SimpleScene & { setup: () => void }).setup();

		// Set background color
		(world.scene.three as THREE.Scene).background = new THREE.Color('#f8fafc');

		world.renderer = new OBC.SimpleRenderer(components, container);
		world.camera = new OBC.SimpleCamera(components);

		components.init();

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

			// Set better camera position after model loads
			setTimeout(() => {
				world!.camera.controls?.setLookAt(100, 70, 100, 0, 0, 0);
			}, 100);

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

		world.camera.controls?.setLookAt(12, 6, 8, 0, 0, -10);

		// Add lights
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		world.scene.three.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(5, 10, 5);
		world.scene.three.add(directionalLight);

		// Setup highlighter for hover and selection effects
		const highlighter = components.get(OBCF.Highlighter);

		highlighter.setup({ world });

		// Configure colors and settings
		highlighter.zoomToSelection = false;

		// Configure hover style - semi-transparent darker blue that shines through other geometry
		highlighter.styles.set('hover', {
			color: new THREE.Color(0x6366f1), // Indigo/purple-blue
			opacity: 0.4,
			transparent: true,
			renderedFaces: 1, // TWO = 1 for both sides
			depthTest: false // Render on top of everything (x-ray effect)
		});

		// Configure selection style (solid blue)
		highlighter.styles.set('select', {
			color: new THREE.Color(0x3b82f6),
			opacity: 0.6,
			transparent: true,
			renderedFaces: 1,
			depthTest: false // Also render on top for selection
		});

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

					// Auto-open properties section when element is selected
					if (sidePanelRef) {
						sidePanelRef.setActiveAccordion('properties');
					}
					// Auto-open side panel if closed
					if (!sidePanelOpen) {
						sidePanelOpen = true;
					}
				}
			} catch (err) {
				// Silently handle selection errors
			}
		});
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

	function toggleSidePanel() {
		sidePanelOpen = !sidePanelOpen;
	}

	function handleTreeItemClick(item: TreeNode) {
		if (item.expressID && currentModel) {
			// Highlight the element in the viewer
			const highlighter = components?.get(OBCF.Highlighter);
			if (highlighter) {
				try {
					// Clear previous selection
					highlighter.clear('select');

					// Select the new element
					const modelName = Object.keys((components!.get(OBC.FragmentsManager) as any).list)[0];
					(highlighter as any).highlight(
						'select',
						new Map([[modelName, new Set([item.expressID])]])
					);

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
			bind:this={sidePanelRef}
			isOpen={sidePanelOpen}
			tree={ifcTree}
			{hasModel}
			{selectedElement}
			onToggle={toggleSidePanel}
			onTreeItemClick={handleTreeItemClick}
			onTreeItemHover={handleTreeItemHover}
			onVisibilityToggle={handleVisibilityToggle}
		/>

		<!-- Toggle Button (when panel is closed) -->
		{#if !sidePanelOpen}
			<button
				onclick={toggleSidePanel}
				class="absolute top-4 left-4 z-20 rounded bg-white p-2 shadow-md transition-colors hover:bg-gray-50"
				aria-label="Open panel"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 text-gray-700"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<line x1="3" y1="12" x2="21" y2="12" />
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="3" y1="18" x2="21" y2="18" />
				</svg>
			</button>
		{/if}

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
