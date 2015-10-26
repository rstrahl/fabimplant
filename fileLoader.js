var dicomParser = require('dicom-parser');

document.body.addEventListener('load', initDropZone(document.getElementById('dropZone')));

function initDropZone(element) {
	console.log("Called initDropZone");
	if (window.File && window.FileReader && window.FileList && window.Blob) {
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileSelect, false);
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
	reader.onload = function(file) {
		console.log("onload called");
		var arrayBuffer = reader.result;
		var byteArray = new Uint8Array(arrayBuffer);
		var dataSet = dicomParser.parseDicom(byteArray);

    // get the pixel data element (contains the offset and length of the data)
    var pixelDataElement = dataSet.elements.x7fe00010;
		console.log("pixelDataElement: "+ JSON.stringify(pixelDataElement, null, '  '));
    // create a typed array on the pixel data (this example assumes 16 bit unsigned data)
    var pixelData = new Uint8Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length);
		console.log(pixelData.slice(0,100));
	};
	reader.readAsArrayBuffer(file);
}

// Refactor this out to actually translate an entire File object
function toBuffer(arrayBuffer) {
    var buffer = new Buffer(arrayBuffer.byteLength);
    var view = new Uint8Array(arrayBuffer);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}
