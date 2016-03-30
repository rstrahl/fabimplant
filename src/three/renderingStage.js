
import THREE from 'three';
import Stats from 'stats.js';
import createOrbitControls from 'three-orbit-controls';
import MeshControl from './meshControl';
import { bind } from 'decko';

const NEAR = -500;
const FAR = 1000;
const CAMERA_DEFAULT_POSITION = new THREE.Vector3(100, 25, 100);

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
		this.controlMode = CONTROL_MODE_MODEL;

		this.volumeMesh = undefined;

		this.lastX = 0;
		this.lastY = 0;
		this.xDelta = 0; // TODO: Move this into meshprops
		this.yDelta = 0;

		let { left, right, top, bottom, position } = this.cameraProps;
		this.camera = new THREE.OrthographicCamera(left, right, top, bottom, NEAR, FAR);
		this.camera.position.set(position.x, position.y, position.z);
		this.scene = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer({antialias : true});
		this.renderer.domElement.onmousedown = this.handleMouseDown;
		this.renderer.domElement.onmouseup = this.handleMouseUp;

		// Stats
		this.stats = new Stats();
		this.stats.setMode(0);
		this.stats.domElement.className = 'stats-render';
		this.stats.domElement.style.display = 'none';

		// TODO: Move into loadStage?
		this.axisHelper = new THREE.AxisHelper(FAR/2);
		this.gridHelper = new THREE.GridHelper(100, 10);

		let OrbitControls = createOrbitControls(THREE);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.meshControl = new MeshControl(this.volumeMesh, this.renderer.domElement);

		this.ambientLight = new THREE.AmbientLight(0x404040);
		this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
		this.directionalLight.position.set(0,250,100);
		this.scene.add(this.ambientLight);
		this.scene.add(this.directionalLight);
	}

	@bind
	loadStage() {
		// TODO: Move to using a group
		if (this.volumeMesh !== undefined) {
			this.meshControl.mesh = this.volumeMesh;
			this.scene.add(this.volumeMesh);
			if (this.debugMode) {
				this.wireframeHelper = new THREE.WireframeHelper(this.volumeMesh, 0xAAAAFF);
				this.scene.add(this.wireframeHelper);
			}
		}
	}

	clearStage() {
		this.scene.remove(this.volumeMesh);
		this.scene.remove(this.wireframeHelper);
		this.wireFrameHelper = null;
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
	animate() {
		requestAnimationFrame(this.animate);
		if (this.dirtyProjection === true) {
			this.cleanRender();
		}
		// this.updateVolumeMesh();
		this.controls.update();
		this.stats.update();
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
	updateVolumeMesh() {
		// TODO: Use this instead as the callback provided to meshControl.
		let rotationX = -this.yDelta*0.005 * Math.PI;
		let rotationY = this.xDelta*0.005 * Math.PI;
		this.volumeMesh.rotation.x = rotationX;
		this.volumeMesh.rotation.y = rotationY;
	}

	@bind
	handleMouseDown(e) {
		// TODO: assign meshControl methods directly to the domElement?
		if (this.controlMode === CONTROL_MODE_MODEL) {
			this.meshControl.handleMouseDown(e);
		}
	}

	@bind
	handleMouseUp(e) {
		if (this.controlMode === CONTROL_MODE_MODEL) {
			this.meshControl.handleMouseUp(e);
		}
	}

	@bind
	setControlMode(controlMode) {
		this.controlMode = (controlMode !== CONTROL_MODE_ORBIT) ? CONTROL_MODE_MODEL : CONTROL_MODE_ORBIT;
		if (this.controlMode === CONTROL_MODE_MODEL) {
			console.log('ControlMode: MODEL');
		} else {
			console.log('ControlMode: ORBIT');
		}
	}

	@bind
	setDebugMode(debugMode) {
		this.debugMode = debugMode;
		if (this.debugMode === true) {
			this.scene.add(this.axisHelper);
			this.scene.add(this.wireframeHelper);
			this.scene.add(this.gridHelper);
			this.stats.domElement.style.display = 'block';
		} else {
			this.scene.remove(this.axisHelper);
			this.scene.remove(this.wireframeHelper);
			this.scene.remove(this.gridHelper);
			this.stats.domElement.style.display = 'none';
		}
	}

	get rendererElement() {
		return this.renderer.domElement;
	}

	get statsElement() {
		return this.stats.domElement;
	}

}
