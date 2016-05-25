/** A data object that stores all information related to a FabImplant session.
 */
export default class Session {

	constructor() {
		this.dicomFile = null;
		this.implantFile = null;
		this.windowWidth = 4096;
		this.windowCenter = 2048;
	}

}