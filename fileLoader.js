var dicomjs = require('dicomjs');

function initDropZone(element) {
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
	// do the love
	dicomjs.parseFile(sampleDcmPath, function (err, dcmData) {
	    console.log('Parsing file complete..');

	    if (!err) {
	        /// Reading patient name
	        var patientName = dcmData.dataset['00100010'].value;
					console.log("Read patient record: "+patientName);
	    } else {
	        console.log(err);
	    }
	});
}
