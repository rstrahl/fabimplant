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
	i.length = parseFloat(height);
	i.radiusTop = parseFloat(topradius);
	i.radiusBottom = parseFloat(bottomradius);
	i.matrix = [
		parseFloat(data.$.mat0), parseFloat(data.$.mat1), parseFloat(data.$.mat2), parseFloat(data.$.mat3),
		parseFloat(data.$.mat4), parseFloat(data.$.mat5), parseFloat(data.$.mat6), parseFloat(data.$.mat7),
		parseFloat(data.$.mat8), parseFloat(data.$.mat9), parseFloat(data.$.mat10), parseFloat(data.$.mat11),
		parseFloat(data.$.mat12), parseFloat(data.$.mat13), parseFloat(data.$.mat14), parseFloat(data.$.mat15)
	];
	let x = parseFloat(data.$.mat3),
		y = parseFloat(data.$.mat7),
		z = parseFloat(data.$.mat11);
	// Normalize from 2d coordinate space into 3d
	// i.x = x - (x / 2);
	// i.y = y - (y / 2);
	// i.z = z - (z / 2);
	i.x = x;
	i.y = y;
	i.z = z;
	return i;
}
