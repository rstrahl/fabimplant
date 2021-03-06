
/** An object that describes a 3-dimensional volumetric data set in an array.
 *
 * @param {Array}  data   a contiguous array that represents a 3-dimensional volume
 * @param {number} width  the width of the volume
 * @param {number} height the height of the volume
 * @param {number} depth  the depth of the volume
 */
export default function Volume(data, width, height, depth, step) {
	this.data = data;
	this.width = width;
	this.height = height;
	this.depth = depth;
	this.step = step;
}
