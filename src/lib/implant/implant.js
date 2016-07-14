/** A data object that represents an implant.
 */
export default class Implant {

	/** Constructor.
	 * @param  {string} manufacturerName Manufacturer name
	 * @param  {string} modelName        Model name
	 * @param  {number} length           Length of the implant in millimeters
	 * @param  {number} radiusTop        Radius of the implant top, in millimeters
	 * @param  {number} radiusBottom     Radius of the implant bottom, in millimeters
	 * @param  {array}  matrix           The transformation matrix for the implant
	 * @return {Object}                  A data object that represents an Implant
	 */
	constructor(id, manufacturerName, modelName, length, radiusTop, radiusBottom, matrix) {
		this.id = id;
		this.manufacturerName = manufacturerName;
		this.modelName = modelName;
		this.length = length;
		this.radiusTop = radiusTop;
		this.radiusBottom = radiusBottom;
		this.matrix = matrix;
		this.x = 0;
		this.y = 0;
		this.z = 0;
	}

}
