import ImplantFile from './implantFile';
import Implant from './implant';

export default function parse(data) {
	let implantFile = new ImplantFile();
	implantFile.uid = data.trophy.IToothContext.$.Uid;
	let id = 1;
	for (let data of data.trophy.IToothContext.VisuVolume.VolumeContext.GraphicObjects.Implants.Implant) {
		let i = carestreamImplant(data, id);
		implantFile.implants.push(i);
		id += 1;
	}
	return implantFile;
}

export function carestreamImplant(data, id) {
	let { manufacturername, modelname, height, topradius, bottomradius } = data.$,
		i = new Implant();
	i.id = id;
	i.manufacturerName = manufacturername;
	i.modelName = modelname;
	i.length = height;
	i.topRadius = topradius;
	i.bottomRadius = bottomradius;
	i.matrix = [data.$.mat0, data.$.mat1, data.$.mat2, data.$.mat3, data.$.mat4, data.$.mat5, data.$.mat6, data.$.mat7, data.$.mat8, data.$.mat9, data.$.mat10, data.$.mat11, data.$.mat12, data.$.mat13, data.$.mat14, data.$.mat15];
	return i;
}
