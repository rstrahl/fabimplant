// main.js
//
// Sets up the application for use in a browser window. Expects there to be
// a single div element with the id 'main' for drag-n-drop functionality.

'use-strict';

import * as fileLoader from './fileLoader';
import * as processor from './processor';
import Promise from 'promise';
import React from 'react';
import ReactDOM from 'react-dom';
import Header from './ui/header.jsx';
import ImageWindow from './ui/imageWindow.jsx';
import DicomDebugWindow from './ui/dicomDebugWindow.jsx';
import DicomFile from './dicomFile';

// UI
let header = React.createElement(Header, null);
let imageWindow = React.createElement(ImageWindow, null);

ReactDOM.render(
	header,
	document.querySelector('header')
);

ReactDOM.render(
	imageWindow,
	document.querySelector('main')
);

window.addEventListener('load', () => {
	let element = document.querySelector('main');
	if (element !== undefined) {
		if (window.File && window.FileReader && window.FileList && window.Blob) {
			element.addEventListener('dragover', handleDragOver, false);
			element.addEventListener('drop', handleFileSelect, false);
		}	else {
			alert('File APIs are not supported in this browser.');
		}
	} else {
		console.error('main element undefined!');
	}
});

// TODO: Refactor this into a navbar script... or something.
document.getElementById('header-button-debug').onclick = () => {
	let e = document.getElementById('sidebar-metadata');
	e.style.display = (window.getComputedStyle(e).display === 'block') ? 'none' : 'block';
};

// TODO Refactor:
// this event handler should be "attachable" to a given window - modularize it
// the inner logic after the Promise.all is fulfilled should also be injectable
// this code should be called by both drag-n-drop and by a file-select input
function handleFileSelect(event) {
	event.stopPropagation();
	event.preventDefault();
	let files = event.dataTransfer.files;
	if (files.length > 0) {
		fileLoader.loadFiles(Array.from(files))
		.then( dataSets => {
			Promise.all(dataSets.map( dataSet => processor.processDataSet(dataSet) ))
			.then( pixelDataArrays => {

				let file = new DicomFile(dataSets[0], pixelDataArrays);
				ReactDOM.render(
					// React.createElement(ImageWindow, {images: imageDatas}),
					React.createElement(ImageWindow, {dicomFile: file}),
					document.querySelector('main')
				);
				
			})
			.catch( err => console.log('Error processing image data: ' + err));
		});
	}
}

function handleDragOver(event) {
	event.stopPropagation();
	event.preventDefault();
	event.dataTransfer.dropEffect = 'copy';
}

// ---
