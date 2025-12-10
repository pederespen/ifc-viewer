import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import type { CompassAxes, FragmentsManager, FragmentGroup } from '$lib/types/viewer';

export interface CameraState {
	initialPosition: THREE.Vector3 | null;
	initialTarget: THREE.Vector3 | null;
}

/**
 * Calculate compass axes from camera rotation
 */
export function calculateCompassAxes(camera: THREE.Camera): CompassAxes {
	camera.updateMatrixWorld();

	const quaternion = new THREE.Quaternion();
	camera.getWorldQuaternion(quaternion);

	const xAxis = new THREE.Vector3(1, 0, 0);
	const yAxis = new THREE.Vector3(0, 1, 0);
	const zAxis = new THREE.Vector3(0, 0, 1);

	const inverseQuat = quaternion.clone().invert();
	xAxis.applyQuaternion(inverseQuat);
	yAxis.applyQuaternion(inverseQuat);
	zAxis.applyQuaternion(inverseQuat);

	const scale = 32;
	return {
		x: { x: xAxis.x * scale, y: -xAxis.y * scale, z: xAxis.z },
		y: { x: yAxis.x * scale, y: -yAxis.y * scale, z: yAxis.z },
		z: { x: zAxis.x * scale, y: -zAxis.y * scale, z: zAxis.z }
	};
}

/**
 * Reset camera to initial position and target
 */
export function resetView(world: OBC.World, state: CameraState, onUpdate?: () => void): void {
	if (!world.camera?.controls || !state.initialPosition || !state.initialTarget) {
		console.warn('Reset view: initial camera position not set');
		return;
	}

	world.camera.controls.setLookAt(
		state.initialPosition.x,
		state.initialPosition.y,
		state.initialPosition.z,
		state.initialTarget.x,
		state.initialTarget.y,
		state.initialTarget.z,
		false
	);

	onUpdate?.();
}

/**
 * Recenter camera while keeping current rotation
 */
export function recenterView(world: OBC.World, state: CameraState, onUpdate?: () => void): void {
	if (!world.camera?.controls || !state.initialTarget || !state.initialPosition) {
		console.warn('Recenter view: initial camera target not set');
		return;
	}

	const currentPosition = new THREE.Vector3();
	const currentTarget = new THREE.Vector3();
	world.camera.controls.getPosition(currentPosition);
	world.camera.controls.getTarget(currentTarget);

	const direction = new THREE.Vector3().subVectors(currentPosition, currentTarget).normalize();
	const initialDistance = state.initialPosition.clone().sub(state.initialTarget).length();
	const newPosition = state.initialTarget.clone().add(direction.multiplyScalar(initialDistance));

	world.camera.controls.setLookAt(
		newPosition.x,
		newPosition.y,
		newPosition.z,
		state.initialTarget.x,
		state.initialTarget.y,
		state.initialTarget.z,
		false
	);

	onUpdate?.();
}

/**
 * Fit camera to show the entire model
 */
export async function fitCameraToModel(
	world: OBC.World,
	components: OBC.Components,
	currentModel: { object?: THREE.Object3D } | null
): Promise<CameraState | null> {
	try {
		const bbox = new THREE.Box3();
		let foundObjects = false;

		// Try fragments manager first
		const fragments = components.get(OBC.FragmentsManager) as unknown as FragmentsManager;
		for (const [, fragmentGroup] of fragments.list) {
			const group = fragmentGroup as FragmentGroup;
			if (group?.object) {
				const groupBox = new THREE.Box3().setFromObject(group.object);
				bbox.union(groupBox);
				foundObjects = true;
			}
		}

		// Fallback to currentModel
		if (!foundObjects && currentModel?.object) {
			bbox.setFromObject(currentModel.object);
			foundObjects = true;
		}

		// Fallback to scene traversal
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
			return null;
		}

		const center = new THREE.Vector3();
		const size = new THREE.Vector3();
		bbox.getCenter(center);
		bbox.getSize(size);

		const maxDim = Math.max(size.x, size.y, size.z);
		const camera = world.camera.three as THREE.PerspectiveCamera;
		const fov = camera.fov * (Math.PI / 180);
		const distance = (maxDim / (2 * Math.tan(fov / 2))) * 1.5;

		const offset = new THREE.Vector3(distance * 0.7, distance * 0.5, distance * 0.7);
		const cameraPos = center.clone().add(offset);

		world.camera.controls?.setLookAt(
			cameraPos.x,
			cameraPos.y,
			cameraPos.z,
			center.x,
			center.y,
			center.z,
			false
		);

		return {
			initialPosition: cameraPos.clone(),
			initialTarget: center.clone()
		};
	} catch (err) {
		console.error('Error fitting camera to model:', err);
		return null;
	}
}
