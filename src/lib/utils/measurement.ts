import * as THREE from 'three';
import * as OBC from '@thatopen/components';

export interface RaycastResult {
	point: THREE.Vector3;
	normal: THREE.Vector3;
}

export interface MeasurementPoint {
	position: THREE.Vector3;
	marker: THREE.Mesh;
}

export interface Measurement {
	id: number;
	startPoint: THREE.Vector3;
	endPoint: THREE.Vector3;
	distance: number;
	line: THREE.Line;
	label: HTMLDivElement;
	startMarker: THREE.Mesh;
	endMarker: THREE.Mesh;
}

export interface MeasurementData {
	id: number;
	distance: number;
	formattedDistance: string;
}

export class MeasurementTool {
	private components: OBC.Components;
	private world: OBC.World;
	private enabled = false;
	private startPoint: MeasurementPoint | null = null;
	private previewLine: THREE.Line | null = null;
	private cursorMarker: THREE.Mesh | null = null;
	private measurements: Measurement[] = [];
	private nextMeasurementId = 1;
	private labelContainer: HTMLDivElement;

	// Callbacks
	public onEnabledChange?: (enabled: boolean) => void;
	public onMeasurementComplete?: (distance: number) => void;
	public onMeasurementsChange?: (measurements: MeasurementData[]) => void;

	constructor(components: OBC.Components, world: OBC.World) {
		this.components = components;
		this.world = world;

		// Create label container
		this.labelContainer = document.createElement('div');
		this.labelContainer.style.position = 'absolute';
		this.labelContainer.style.top = '0';
		this.labelContainer.style.left = '0';
		this.labelContainer.style.pointerEvents = 'none';
		this.labelContainer.style.zIndex = '1000';

		const renderer = world.renderer?.three.domElement;
		if (renderer?.parentElement) {
			renderer.parentElement.appendChild(this.labelContainer);
		}
	}

	get isEnabled(): boolean {
		return this.enabled;
	}

	toggle(): void {
		if (this.enabled) {
			this.disable();
		} else {
			this.enable();
		}
	}

	enable(): void {
		this.enabled = true;
		this.onEnabledChange?.(true);
		this.createCursorMarker();
	}

	disable(): void {
		this.enabled = false;
		this.onEnabledChange?.(false);
		this.cancelMeasurement();
		this.removeCursorMarker();
	}

	private createCursorMarker(): void {
		if (this.cursorMarker) return;

		// Use a sprite material for a circle that always faces the camera
		const canvas = document.createElement('canvas');
		canvas.width = 64;
		canvas.height = 64;
		const ctx = canvas.getContext('2d')!;

		// Draw a filled circle
		ctx.beginPath();
		ctx.arc(32, 32, 28, 0, Math.PI * 2);
		ctx.fillStyle = '#1e40af';
		ctx.fill();

		// Add a white border
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 4;
		ctx.stroke();

		const texture = new THREE.CanvasTexture(canvas);
		const material = new THREE.SpriteMaterial({
			map: texture,
			depthTest: false,
			transparent: true
		});

		const sprite = new THREE.Sprite(material);
		sprite.scale.set(0.1, 0.1, 1);
		sprite.renderOrder = 999;
		sprite.visible = false;

		// Store as mesh type for compatibility (Sprite extends Object3D)
		this.cursorMarker = sprite as unknown as THREE.Mesh;
		this.world.scene.three.add(sprite);
	}

	private removeCursorMarker(): void {
		if (this.cursorMarker) {
			this.world.scene.three.remove(this.cursorMarker);
			this.cursorMarker.geometry.dispose();
			(this.cursorMarker.material as THREE.Material).dispose();
			this.cursorMarker = null;
		}
	}

	private createPointMarker(position: THREE.Vector3, _normal?: THREE.Vector3): THREE.Mesh {
		// Use a sprite for a circle that always faces the camera
		const canvas = document.createElement('canvas');
		canvas.width = 64;
		canvas.height = 64;
		const ctx = canvas.getContext('2d')!;

		// Draw a filled circle
		ctx.beginPath();
		ctx.arc(32, 32, 28, 0, Math.PI * 2);
		ctx.fillStyle = '#1e40af';
		ctx.fill();

		// Add a white border
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 4;
		ctx.stroke();

		const texture = new THREE.CanvasTexture(canvas);
		const material = new THREE.SpriteMaterial({
			map: texture,
			depthTest: false,
			transparent: true
		});

		const sprite = new THREE.Sprite(material);
		sprite.position.copy(position);
		sprite.scale.set(0.1, 0.1, 1);
		sprite.renderOrder = 999;

		this.world.scene.three.add(sprite);
		return sprite as unknown as THREE.Mesh;
	}

	private createPreviewLine(start: THREE.Vector3): void {
		// Create cylinder for thick preview line
		const geometry = new THREE.CylinderGeometry(0.015, 0.015, 0.001, 8, 1);
		const material = new THREE.MeshBasicMaterial({
			color: 0x1e40af,
			depthTest: false
		});
		this.previewLine = new THREE.Mesh(geometry, material) as unknown as THREE.Line;
		this.previewLine.renderOrder = 999;
		this.previewLine.position.copy(start);
		this.world.scene.three.add(this.previewLine);
	}

	private updatePreviewLine(end: THREE.Vector3): void {
		if (!this.previewLine || !this.startPoint) return;

		const start = this.startPoint.position;
		const direction = new THREE.Vector3().subVectors(end, start);
		const length = direction.length();

		if (length < 0.001) return; // Avoid issues with zero-length

		// Update geometry with new length
		const mesh = this.previewLine as unknown as THREE.Mesh;
		mesh.geometry.dispose();
		mesh.geometry = new THREE.CylinderGeometry(0.015, 0.015, length, 8, 1);

		// Position at midpoint
		const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
		mesh.position.copy(midpoint);

		// Orient along the direction
		mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
	}

	private createMeasurementLine(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
		// Create a cylinder between two points for a thick line
		const direction = new THREE.Vector3().subVectors(end, start);
		const length = direction.length();

		// CylinderGeometry is oriented along Y axis, so we need to rotate it
		const geometry = new THREE.CylinderGeometry(0.015, 0.015, length, 8, 1);
		const material = new THREE.MeshBasicMaterial({
			color: 0x1e40af,
			depthTest: false
		});

		const cylinder = new THREE.Mesh(geometry, material);

		// Position at midpoint
		const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
		cylinder.position.copy(midpoint);

		// Orient along the direction
		cylinder.quaternion.setFromUnitVectors(
			new THREE.Vector3(0, 1, 0),
			direction.clone().normalize()
		);

		cylinder.renderOrder = 999;
		this.world.scene.three.add(cylinder);

		// Return as Line type for compatibility (it's stored in measurements array)
		return cylinder as unknown as THREE.Line;
	}

	private createMeasurementLabel(
		start: THREE.Vector3,
		end: THREE.Vector3,
		distance: number
	): HTMLDivElement {
		const label = document.createElement('div');
		label.className = 'measurement-label';
		label.style.cssText = `
			position: absolute;
			background: rgba(30, 64, 175, 0.95);
			color: white;
			padding: 4px 10px;
			border-radius: 4px;
			font-size: 13px;
			font-weight: 600;
			white-space: nowrap;
			transform: translate(-50%, -50%);
			box-shadow: 0 2px 8px rgba(0,0,0,0.2);
			font-family: system-ui, -apple-system, sans-serif;
		`;
		label.textContent = this.formatDistance(distance);
		this.labelContainer.appendChild(label);
		return label;
	}

	private formatDistance(distance: number): string {
		return `${distance.toFixed(2)} m`;
	}

	private notifyMeasurementsChange(): void {
		this.onMeasurementsChange?.(this.getMeasurements());
	}

	getMeasurements(): MeasurementData[] {
		return this.measurements.map((m) => ({
			id: m.id,
			distance: m.distance,
			formattedDistance: this.formatDistance(m.distance)
		}));
	}

	deleteMeasurement(id: number): void {
		const index = this.measurements.findIndex((m) => m.id === id);
		if (index === -1) return;

		const measurement = this.measurements[index];

		// Remove from scene
		this.world.scene.three.remove(measurement.line);
		this.world.scene.three.remove(measurement.startMarker);
		this.world.scene.three.remove(measurement.endMarker);

		// Dispose geometry and materials
		measurement.line.geometry.dispose();
		(measurement.line.material as THREE.Material).dispose();
		measurement.startMarker.geometry.dispose();
		(measurement.startMarker.material as THREE.Material).dispose();
		measurement.endMarker.geometry.dispose();
		(measurement.endMarker.material as THREE.Material).dispose();

		// Remove label
		measurement.label.remove();

		// Remove from array
		this.measurements.splice(index, 1);

		this.notifyMeasurementsChange();
	}

	private async getIntersection(_event: MouseEvent): Promise<RaycastResult | null> {
		// Use OBC Raycasters which properly handles fragment meshes
		const raycasters = this.components.get(OBC.Raycasters);
		const raycaster = raycasters.get(this.world);
		const result = await raycaster.castRay();

		if (result && result.point) {
			// Normal not reliably available from IFC fragments, use default
			const normal = new THREE.Vector3(0, 0, 1);
			return { point: result.point, normal };
		}

		return null;
	}

	async handlePointerMove(event: MouseEvent): Promise<void> {
		if (!this.enabled) return;

		const result = await this.getIntersection(event);

		if (result && this.cursorMarker) {
			this.cursorMarker.visible = true;
			this.cursorMarker.position.copy(result.point);

			// Scale marker based on distance from camera
			const camera = this.world.camera?.three as THREE.PerspectiveCamera;
			if (camera) {
				const dist = camera.position.distanceTo(result.point);
				const scale = Math.max(0.5, Math.min(2, dist * 0.02)) * 0.3;
				this.cursorMarker.scale.set(scale, scale, 1);

				// Also scale start point marker if exists
				if (this.startPoint) {
					this.startPoint.marker.scale.set(scale, scale, 1);
				}
			}

			if (this.startPoint && this.previewLine) {
				this.updatePreviewLine(result.point);
			}
		} else if (this.cursorMarker) {
			this.cursorMarker.visible = false;
		}
	}

	async handleDoubleClick(event: MouseEvent): Promise<boolean> {
		if (!this.enabled) return false;

		const result = await this.getIntersection(event);
		if (!result) return false;

		if (!this.startPoint) {
			// First point
			const marker = this.createPointMarker(result.point, result.normal);

			// Scale marker based on camera distance
			const camera = this.world.camera?.three as THREE.PerspectiveCamera;
			if (camera) {
				const distance = camera.position.distanceTo(result.point);
				const scale = Math.max(0.5, Math.min(2, distance * 0.02)) * 0.3;
				marker.scale.set(scale, scale, 1);
			}

			this.startPoint = { position: result.point.clone(), marker };
			this.createPreviewLine(result.point);
		} else {
			// Second point - complete measurement
			const distance = this.startPoint.position.distanceTo(result.point);
			const line = this.createMeasurementLine(this.startPoint.position, result.point);
			const endMarker = this.createPointMarker(result.point, result.normal);

			// Scale end marker to match start marker
			endMarker.scale.copy(this.startPoint.marker.scale);

			const label = this.createMeasurementLabel(this.startPoint.position, result.point, distance);

			this.measurements.push({
				id: this.nextMeasurementId++,
				startPoint: this.startPoint.position.clone(),
				endPoint: result.point.clone(),
				distance,
				line,
				label,
				startMarker: this.startPoint.marker,
				endMarker
			});

			// Clean up preview
			if (this.previewLine) {
				this.world.scene.three.remove(this.previewLine);
				this.previewLine.geometry.dispose();
				(this.previewLine.material as THREE.Material).dispose();
				this.previewLine = null;
			}

			// Reset startPoint (marker is now owned by measurement)
			this.startPoint = null;

			this.onMeasurementComplete?.(distance);
			this.notifyMeasurementsChange();

			// Update label position immediately
			this.updateLabels();
		}

		return true; // Prevent default double-click behavior
	}

	cancelMeasurement(): void {
		if (this.startPoint) {
			this.world.scene.three.remove(this.startPoint.marker);
			this.startPoint.marker.geometry.dispose();
			(this.startPoint.marker.material as THREE.Material).dispose();
			this.startPoint = null;
		}

		if (this.previewLine) {
			this.world.scene.three.remove(this.previewLine);
			this.previewLine.geometry.dispose();
			(this.previewLine.material as THREE.Material).dispose();
			this.previewLine = null;
		}
	}

	clearAllMeasurements(): void {
		this.cancelMeasurement();

		for (const measurement of this.measurements) {
			this.world.scene.three.remove(measurement.line);
			this.world.scene.three.remove(measurement.startMarker);
			this.world.scene.three.remove(measurement.endMarker);
			measurement.line.geometry.dispose();
			(measurement.line.material as THREE.Material).dispose();
			measurement.startMarker.geometry.dispose();
			(measurement.startMarker.material as THREE.Material).dispose();
			measurement.endMarker.geometry.dispose();
			(measurement.endMarker.material as THREE.Material).dispose();
			measurement.label.remove();
		}
		this.measurements = [];
		this.notifyMeasurementsChange();
	}

	updateLabels(): void {
		const camera = this.world.camera?.three as THREE.Camera;
		const renderer = this.world.renderer?.three;
		if (!camera || !renderer) return;

		for (const measurement of this.measurements) {
			const midPoint = new THREE.Vector3()
				.addVectors(measurement.startPoint, measurement.endPoint)
				.multiplyScalar(0.5);

			// Project to screen
			const projected = midPoint.clone().project(camera);
			const rect = renderer.domElement.getBoundingClientRect();

			const x = (projected.x * 0.5 + 0.5) * rect.width;
			const y = (-projected.y * 0.5 + 0.5) * rect.height;

			// Check if in front of camera
			if (projected.z < 1) {
				measurement.label.style.left = `${x}px`;
				measurement.label.style.top = `${y}px`;
				measurement.label.style.display = 'block';
			} else {
				measurement.label.style.display = 'none';
			}
		}
	}

	dispose(): void {
		this.disable();
		this.clearAllMeasurements();
		this.labelContainer.remove();
	}
}
