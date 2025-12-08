<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import * as OBC from '@thatopen/components';

	let container: HTMLDivElement;
	let components: OBC.Components | null = null;
	let world: OBC.World | null = null;
	let isDragging = false;
	let hasModel = false;

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
		world.scene.setup();

		// Set background color
		world.scene.three.background = new THREE.Color('#0f172a');

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
					add?: (callback: (data: { value: unknown }) => void) => void;
				};
			};
			core?: {
				update?: (force: boolean) => void;
			};
		};

		fragments.init?.(workerUrl);

		// Set up event handler for when models are loaded
		fragments.list?.onItemSet?.add?.(({ value: model }: { value: unknown }) => {
			const typedModel = model as {
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
			alert('Please select an IFC file');
			return;
		}

		if (!components || !world) return;

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
		} catch (error) {
			console.error('Error loading IFC file:', error);
			alert('Error loading IFC file. Please check the console for details.');
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

<div class="relative flex h-full w-full flex-col">
	<!-- Header -->
	<div class="z-10 flex items-center gap-6 border-b border-slate-700 bg-slate-800 px-6 py-4">
		<h1 class="text-2xl font-semibold text-slate-100">IFC Viewer</h1>
		<button
			class="flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
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
		<input id="file-input" type="file" accept=".ifc" class="hidden" onchange={handleFileInput} />
	</div>

	<!-- Viewer Area -->
	<div
		class="relative flex-1 overflow-hidden transition-colors {isDragging ? 'bg-blue-500/10' : ''}"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		role="button"
		tabindex="0"
	>
		<div bind:this={container} class="h-full w-full"></div>

		{#if !hasModel}
			<div
				class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-500 {isDragging
					? 'text-blue-500'
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
	</div>
</div>
