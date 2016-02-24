
import THREE from 'three';
import Stats from 'stats.js';
import createOrbitControls from 'three-orbit-controls';
import { bind } from 'decko';

const NEAR = -500;
const FAR = 1000;
const CAMERA_MODE_ORBIT = 0;
const CAMERA_MODE_MODEL = 1;
const CAMERA_DEFAULT_POSITION = new THREE.Vector3(100, 25, 100);

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
		this.cameraMode = CAMERA_MODE_MODEL;

		this.volumeMesh = undefined;
		this.scaffoldMesh = undefined;

		this.lastX = 0;
		this.lastY = 0;
		this.xDelta = 0; // TODO: Move this into meshprops
		this.yDelta = 0;

		let { left, right, top, bottom, position } = this.cameraProps;
		this.camera = new THREE.OrthographicCamera(left, right, top, bottom, NEAR, FAR);
		this.camera.position.set(position.x, position.y, position.z);
		this.scene = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer({antialias : true});

		// Stats
		this.stats = new Stats();
		this.stats.setMode(0);
		this.stats.domElement.className = 'stats-render';
		this.stats.domElement.style.display = 'none';

		this.axisHelper = new THREE.AxisHelper(FAR/2);

		let OrbitControls = createOrbitControls(THREE);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);

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
			this.scene.add(this.volumeMesh);
			this.wireframeHelper = new THREE.WireframeHelper(this.volumeMesh, 0xAAAAFF);
			if (this.debugMode) {
				this.scene.add(this.wireframeHelper);
			}
		}
		if (this.scaffoldMesh !== undefined) {
			this.scene.add(this.scaffoldMesh);
		}
	}

	clearStage() {
		this.scene.remove(this.volumeMesh);
		this.scene.remove(this.scaffoldMesh);
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
		this.updateVolumeMesh();
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
		let rotationX = -this.yDelta*0.005 * Math.PI;
		let rotationY = this.xDelta*0.005 * Math.PI;
		this.scaffoldMesh.rotation.x = rotationX;
		this.scaffoldMesh.rotation.y = rotationY;
	}

	@bind
	setCameraMode(cameraMode) {
		this.cameraMode = (cameraMode === CAMERA_MODE_MODEL) ? CAMERA_MODE_ORBIT : CAMERA_MODE_MODEL;
		// TODO: Activate appropriate camera code
	}

	@bind
	setDebugMode(debugMode) {
		this.debugMode = debugMode;
		if (this.debugMode === true) {
			this.scene.add(this.axisHelper);
			this.scene.add(this.scaffoldMesh);
			this.scene.add(this.wireframeHelper);
			this.stats.domElement.style.display = 'block';
		} else {
			this.scene.remove(this.axisHelper);
			this.scene.remove(this.scaffoldMesh);
			this.scene.remove(this.wireframeHelper);
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
