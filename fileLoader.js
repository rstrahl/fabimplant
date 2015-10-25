var dicomjs = require('dicomjs');

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
	console.log("Loaded files: " + event.dataTransfer.files.length);
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
		var buffer = toBuffer(arrayBuffer);
		dicomjs.parse(buffer, function (err, dcmData) {
			if (!err) {
					/// Reading patient name
					var patientName = dcmData.dataset['00100010'].value;
					var photometricInterpolation = dcmData.dataset['00280004'].value;
					// var numberOfFrames = dcmData.dataset['00280008'].value;
					var rows = dcmData.dataset['00280010'].value;
					var columns = dcmData.dataset['00280011'].value;
					console.log("Read patient record: "+patientName);
					console.log("Read photometricInterpolation: "+photometricInterpolation);
					// console.log("Read numberOfFrames: "+numberOfFrames);
					console.log("Read rows: "+rows);
					console.log("Read columns: "+columns);
			} else {
					console.log(err);
			}
		});
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
