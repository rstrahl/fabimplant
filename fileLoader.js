import dicomParser from 'dicom-parser';
import dataDictionary from './dataDictionary';
import uids from './uids';
import Decoder from 'JPEGLosslessDecoderJS';

window.addEventListener('load', () => {
	console.log("Adding event listener.");
	initDropZone(document.getElementById('dropZone'));
});

function initDropZone(element) {
	console.log("Called initDropZone");
	if (window.File && window.FileReader && window.FileList && window.Blob) {
		element.addEventListener('dragover', handleDragOver, false);
		element.addEventListener('drop', handleFileSelect, false);
	}
	else {
		alert("File APIs are not supported in this browser.");
	}
}

function handleFileSelect(event) {
	event.stopPropagation();
	event.preventDefault();
	var files = event.dataTransfer.files;
	loadFile(files[0]);
}

function handleDragOver(event) {
	event.stopPropagation();
	event.preventDefault();
	event.dataTransfer.dropEffect = 'copy';
}

function loadFile(file) {
	console.log("loadFile");
	var reader = new FileReader();
	reader.onload = file => {
		console.log("onload called");
		var arrayBuffer = reader.result;
		var byteArray = new Uint8Array(arrayBuffer);
		var dataSet = dicomParser.parseDicom(byteArray);

		// get the pixel data element (contains the offset and length of the data)
		var pixelDataElement = dataSet.elements.x7fe00010;
		console.log("pixelDataElement: "+ JSON.stringify(pixelDataElement, null, '  '));

		// TODO: refactor this out to some sort of helper struct
		var imageMetadata = {
			rows : dataSet.uint16('x00280010'),
			cols : dataSet.uint16('x00280011'),
			samplesPerPixel: dataSet.uint16('x00280002'),
			pixelRepresentation : dataSet.uint16('x00280103'),
			interpretation : dataSet.string('x00280004'),
			planarConfiguration : dataSet.uint16('x00280006'),
			frames : dataSet.uint16('x00280008'),
			bitsAllocated : dataSet.uint16('x00280100'),
			bitsStored : dataSet.uint16('x00280101'),
			transferSyntax : uids[dataSet.string('x00020010')],
			sopClassUID : uids[dataSet.string('x00080016')],
			compressionMethod : dataSet.string('x00282114'),
			pixelPaddingValue : dataSet.string('x00280120')
		};

		console.log("imageMetadata: "+ JSON.stringify(imageMetadata, null, '  '));

    var canvas = document.querySelector('canvas'),
		    ctx = canvas.getContext('2d'),
		    width = imageMetadata.cols,
				height = imageMetadata.rows;

		// resize canvas to match dims
		canvas.setAttribute('width', width);
		canvas.setAttribute('height', height);
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';

		// decode image data
		var byteOutput = imageMetadata.bitsAllocated <= 8 ? 1 : 2;
		var decoder = new Decoder();
		var decompressedData = decoder.decompress(dataSet.byteArray.buffer, pixelDataElement.fragments[0].position, pixelDataElement.fragments[0].length);
		var pixelData;
		if (imageMetadata.pixelRepresentation === 0) {
      if (byteOutput === 2) {
        pixelData = new Uint16Array(decompressedData);
      } else {
        // untested!
        pixelData = new Uint8Array(decompressedData);
      }
    } else {
      pixelData = new Int16Array(decompressedData);
    }

		// create imagedata
		let img = ctx.getImageData(0,0,width, height);
		let data = img.data;

		let i = 0, j = 0;
		while (i < pixelData.length) {
			let val = (pixelData[i] / 4096) * 255; // normalized to 8bit
			j = i*4;
			data[j] = val;		// r
		  data[j+1] = val;	// g
		  data[j+2] = val;	// b
		  data[j+3] = 255;	// a
			i++;
		}

		ctx.putImageData(img, 0, 0);
	};
	reader.readAsArrayBuffer(file);
}

// TODO: Refactor this out to actually translate an entire File object?
function toBuffer(arrayBuffer) {
	var buffer = new Buffer(arrayBuffer.byteLength);
	var view = new Uint8Array(arrayBuffer);
	for (var i = 0; i < buffer.length; ++i) {
		buffer[i] = view[i];
	}
	return buffer;
}
