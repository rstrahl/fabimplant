/** A data object that represents an implant.
 */
export default class Implant {

	/** Constructor.
	 * @param  {string} manufacturerName Manufacturer name
	 * @param  {string} modelName        Model name
	 * @param  {number} length           Length of the implant in millimeters
	 * @param  {number} topRadius        Radius of the implant top, in millimeters
	 * @param  {number} bottomRadius     Radius of the implant bottom, in millimeters
	 * @param  {array}  matrix           The transformation matrix for the implant
	 * @return {Object}                  A data object that represents an Implant
	 */
	constructor(id, manufacturerName, modelName, length, topRadius, bottomRadius, matrix) {
		this.id = id;
		this.manufacturerName = manufacturerName;
		this.modelName = modelName;
		this.length = length;
		this.topRadius = topRadius;
		this.bottomRadius = bottomRadius;
		this.matrix = matrix;
	}

}
