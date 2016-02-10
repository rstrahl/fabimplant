
/** An object that describes a 2-dimensional plane of pixel data.
 *
 * @param  {Array}  data   an array
 * @param  {number} width  the width of the volume data
 * @param  {number} height the height of the volume data
 * @return {Object}        an Slice object
 */
export default function(data, width, height) {
	this.data = data;
	this.width = width;
	this.height = height;
}
