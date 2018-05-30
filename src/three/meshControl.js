
import { bind } from 'decko';

/**
 * Provides input control that generates an transformations for a Mesh.
 *
 * The callback will receive a `transform` object that specifies the
 * various transformations for the mesh (e.g. "rotation").
 *
 */
export default class MeshControl {

	constructor(callback) {
		this.lastX = 0;
		this.lastY = 0;
		// this.xDelta = 0;
		// this.yDelta = 0;
		this.callback = callback;
	}

	@bind
	update() {
		// Any animation-specific effects go here
	}

	@bind
	handleMouseDown(e) {
		e.preventDefault();
		e.stopPropagation();
		this.lastX = e.clientX;
		this.lastY = e.clientY;
		addEventListener('mousemove', this.handleMouseMove);
	}

	@bind
	handleMouseMove(e) {
		e.preventDefault();
		e.stopPropagation();
		let xD = e.clientX - this.lastX;
		let yD = this.lastY - e.clientY;
		// this.xDelta += xD;
		// this.yDelta += yD;
		this.lastX = e.clientX;
		this.lastY = e.clientY;
		let rotation = {
			x: -yD*0.005 * Math.PI,
			y: xD*0.005 * Math.PI
		};
		this.callback({ rotation });
	}

	@bind
	handleMouseUp(e) {
		this.xDelta = 0;
		this.yDelta = 0;
		removeEventListener('mousemove', this.handleMouseMove);
	}

}
