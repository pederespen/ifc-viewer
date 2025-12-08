<script lang="ts">
	/* eslint-disable no-unused-vars */
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import * as OBC from '@thatopen/components';

	let container: HTMLDivElement;
	let components: OBC.Components | null = null;
	let world: OBC.World | null = null;
	let isDragging = $state(false);
	let hasModel = $state(false);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let isDarkMode = $state(false);

	onMount(() => {
		// Load dark mode preference from localStorage
		const savedTheme = localStorage.getItem('theme');
		isDarkMode = savedTheme === 'dark';
		applyTheme();
		initViewer();
	});

	function toggleTheme() {
		isDarkMode = !isDarkMode;
		localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
		applyTheme();
	}

	function applyTheme() {
		if (isDarkMode) {
			document.documentElement.classList.add('dark-mode');
		} else {
			document.documentElement.classList.remove('dark-mode');
		}
		// Update Three.js scene background
		if (world?.scene) {
			(world.scene.three as THREE.Scene).background = new THREE.Color(
				isDarkMode ? '#1a1d23' : '#f0f4f8'
			);
		}
	}

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

		// Set background color based on theme
		(world.scene.three as THREE.Scene).background = new THREE.Color(
			isDarkMode ? '#1a1d23' : '#f0f4f8'
		);

		world.renderer = new OBC.SimpleRenderer(components, container);
		world.camera = new OBC.SimpleCamera(components);

		components.init();

		// Fetch and initialize fragments worker
		const githubUrl = 'https://thatopen.github.io/engine_fragment/resources/worker.mjs';
		const fetchedUrl = await fetch(githubUrl);
		const workerBlob = await fetchedUrl.blob();
		const workerFile = new File([workerBlob], 'worker.mjs', {
			type: 'text/javascript'
		});
		const workerUrl = URL.createObjectURL(workerFile);

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

		fragments.init?.(workerUrl);

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

			hasModel = true;
		} catch (err) {
			console.error('Error loading IFC file:', err);
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
</script>

<div class="bg-primary text-primary relative flex h-full w-full flex-col">
	<!-- Header -->
	<div class="border-primary bg-surface z-10 flex items-center gap-6 border-b px-6 py-4 shadow-sm">
		<h1 class="text-2xl font-semibold">IFC Viewer</h1>

		<button
			class="bg-accent-primary hover:bg-accent-hover flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md active:scale-95"
			onclick={triggerFileInput}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="17 8 12 3 7 8" />
				<line x1="12" y1="3" x2="12" y2="15" />
			</svg>
			Upload IFC File
		</button>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Theme Toggle -->
		<button
			onclick={toggleTheme}
			class="text-secondary hover:bg-secondary hover:text-primary rounded-lg p-2.5 transition-all hover:shadow-sm active:scale-95"
			aria-label="Toggle theme"
		>
			{#if isDarkMode}
				<!-- Sun icon (light mode) -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="5" />
					<line x1="12" y1="1" x2="12" y2="3" />
					<line x1="12" y1="21" x2="12" y2="23" />
					<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
					<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
					<line x1="1" y1="12" x2="3" y2="12" />
					<line x1="21" y1="12" x2="23" y2="12" />
					<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
					<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
				</svg>
			{:else}
				<!-- Moon icon (dark mode) -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
				</svg>
			{/if}
		</button>

		<input id="file-input" type="file" accept=".ifc" class="hidden" onchange={handleFileInput} />
	</div>

	<!-- Viewer Area -->
	<div
		class="relative flex-1 overflow-hidden transition-colors {isDragging
			? 'bg-accent-primary/10'
			: ''}"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		role="button"
		tabindex="0"
	>
		<div bind:this={container} class="h-full w-full"></div>

		{#if !hasModel && !isLoading}
			<div
				class="text-secondary pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 {isDragging
					? 'text-accent-primary'
					: ''}"
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
					class="transition-opacity {isDragging ? 'opacity-100' : 'opacity-50'}"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="17 8 12 3 7 8" />
					<line x1="12" y1="3" x2="12" y2="15" />
				</svg>
				<p class="text-lg">Drag & drop an IFC file here</p>
				<p class="text-sm opacity-70">or click the upload button above</p>
			</div>
		{/if}

		{#if isLoading}
			<div
				class="bg-primary/80 absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 backdrop-blur-sm"
			>
				<div
					class="border-secondary border-t-accent-primary h-16 w-16 animate-spin rounded-full border-4"
				></div>
				<p class="text-primary text-lg font-medium">Loading IFC file...</p>
				<p class="text-secondary text-sm">This may take a moment</p>
			</div>
		{/if}

		{#if error}
			<div class="animate-fade-in absolute top-4 right-4 z-30 max-w-md">
				<div class="rounded-lg border border-red-500 bg-red-950/90 p-4 shadow-lg backdrop-blur-sm">
					<div class="flex items-start gap-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 flex-shrink-0 text-red-400"
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
							<h3 class="font-semibold text-red-200">Error Loading IFC File</h3>
							<p class="mt-1 text-sm text-red-300">{error}</p>
						</div>
						<button
							onclick={() => (error = null)}
							class="flex-shrink-0 text-red-400 transition-all hover:scale-110 hover:text-red-200 active:scale-95"
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
