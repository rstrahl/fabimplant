
import THREE from 'three';
import Stats from 'stats.js';
import createOrbitControls from 'three-orbit-controls';
import MeshControl from './meshControl';
import { bind } from 'decko';

const NEAR = -500;
const FAR = 1000;
const CAMERA_DEFAULT_POSITION = new THREE.Vector3(0, 25, 100);

export const CONTROL_MODE_ORBIT = 0;
export const CONTROL_MODE_MODEL = 1;

// TODO: Consider moving to react component
// Props:
// 	- Mesh
// 	- width
// 	- height
// State:
// 	- debugMode
// 	- controlMode
//
export default class RenderingStage {

	constructor() {
		this.debugMode = false;
		this.width = 0;
		this.height = 0;
		this.dirtyProjection = true;
		this.cameraProps = {
			left : 0,
			right : 0,
			top : 0,
			bottom : 0,
			near : NEAR,
			far : FAR,
			zoom : 1.0,
			position : CAMERA_DEFAULT_POSITION
		};

		this.volumeMesh = undefined;

		let { left, right, top, bottom, position } = this.cameraProps;
		this.camera = new THREE.OrthographicCamera(left, right, top, bottom, NEAR, FAR);
		this.camera.position.set(position.x, position.y, position.z);
		this.scene = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer({antialias : true});
		this.renderer.domElement.onmousedown = this.handleMouseDown;
		this.renderer.domElement.onmouseup = this.handleMouseUp;

		// Controls
		this.meshControls = new MeshControl(this.volumeMesh, (transform) => {
			this.volumeMesh.rotation.x = Math.min(Math.max(this.volumeMesh.rotation.x + transform.rotation.x, -Math.PI/2), Math.PI/2);
			this.volumeMesh.rotation.y = Math.min(Math.max(this.volumeMesh.rotation.y + transform.rotation.y, -Math.PI), Math.PI);
		});
		let OrbitControls = createOrbitControls(THREE);
		this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);

		// Stats
		this.stats = new Stats();
		this.stats.setMode(0);
		this.stats.domElement.className = 'stats-render';
		this.stats.domElement.style.display = 'none';

		this.setControlMode(CONTROL_MODE_ORBIT);
	}

	@bind
	loadStage() {
		let { geometry } = this;
		this.ambientLight = new THREE.AmbientLight(0x404040);
		this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
		this.directionalLight.position.set(0,250,100);
		this.scene.add(this.ambientLight);
		this.scene.add(this.directionalLight);
		if (geometry !== undefined) {
			this.volumeMesh = this.createVolumeMesh(geometry);
			this.scene.add(this.volumeMesh);
			if (this.debugMode === true) {
				this.loadStageDebug();
			}
		}
	}

	@bind
	loadStageDebug() {
		// Axis Helper
		this.axisHelper = new THREE.AxisHelper(FAR/2);
		this.scene.add(this.axisHelper);
		// Wireframe Helper
		this.wireframeHelper = new THREE.WireframeHelper(this.volumeMesh, 0xAAAAFF);
		this.scene.add(this.wireframeHelper);
		// Grid Helper
		this.gridHelper = new THREE.GridHelper(100, 10);
		this.scene.add(this.gridHelper);
		// Stats
		this.stats.domElement.style.display = 'block';
	}

	@bind
	clearStage() {
		this.scene.remove(this.ambientlight);
		this.scene.remove(this.directionalLight);
		this.scene.remove(this.volumeMesh);
		if (this.debugMode === true) {
			this.clearStageDebug();
		}
	}

	@bind
	clearStageDebug() {
		this.scene.remove(this.axisHelper);
		this.axisHelper = null;
		this.scene.remove(this.wireframeHelper);
		this.wireframeHelper = null;
		this.scene.remove(this.gridHelper);
		this.gridHelper = null;
		this.stats.domElement.style.display = 'none';
	}

	@bind
	cleanRender() {
		let { width, height } = this;
		let { left, right, top, bottom, near, far, zoom } = this.cameraProps;
		this.dirtyProjection = false;
		this.renderer.setSize(width, height);
		this.camera.left = left;
		this.camera.right = right;
		this.camera.top = top;
		this.camera.bottom = bottom;
		this.camera.near = near;
		this.camera.far = far;
		this.camera.zoom = zoom;
		this.camera.updateProjectionMatrix();
	}

	@bind
	createVolumeMesh(geometry) {
		return new THREE.Mesh(
			geometry,
			new THREE.MeshLambertMaterial({
				color : 0xF0F0F0,
				side : THREE.DoubleSide
			})
		);
	}

	@bind
	animate() {
		requestAnimationFrame(this.animate);
		if (this.dirtyProjection === true) {
			this.cleanRender();
		}
		if (this.debugMode === true) {
			this.stats.update();
		}
		this.controls.update();
		this.renderer.render(this.scene, this.camera);
	}

	@bind
	updateSize(width, height) {
		this.width = width;
		this.height = height;
		this.cameraProps.left = width / -2;
		this.cameraProps.right = width / 2;
		this.cameraProps.top = height / 2;
		this.cameraProps.bottom = height / -2;
		this.dirtyProjection = true;
	}

	@bind
	handleMouseDown(e) {
		if (this.controlMode === CONTROL_MODE_MODEL) {
			this.controls.handleMouseDown(e);
		}
	}

	@bind
	handleMouseUp(e) {
		if (this.controlMode === CONTROL_MODE_MODEL) {
			this.controls.handleMouseUp(e);
		}
	}

	@bind
	setControlMode(controlMode) {
		this.controlMode = (controlMode !== CONTROL_MODE_ORBIT) ? CONTROL_MODE_MODEL : CONTROL_MODE_ORBIT;
		if (this.controlMode === CONTROL_MODE_MODEL) {
			this.orbitControls.enabled = false;
			this.controls = this.meshControls;
		} else {
			this.orbitControls.enabled = true;
			this.controls = this.orbitControls;
		}
	}

	@bind
	setDebugMode(debugMode) {
		this.debugMode = debugMode;
		if (this.debugMode === true) {
			this.loadStageDebug();
		} else {
			this.clearStageDebug();
		}
	}

	get rendererElement() {
		return this.renderer.domElement;
	}

	get statsElement() {
		return this.stats.domElement;
	}

	get vertices() {
		let { volumeMesh } = this;
		return (volumeMesh !== undefined && volumeMesh.geometry !== undefined) ? volumeMesh.geometry.vertices.length : 0;
	}

	get faces() {
		let { volumeMesh } = this;
		return (volumeMesh !== undefined && volumeMesh.geometry !== undefined) ? volumeMesh.geometry.faces.length : 0;
	}

}
