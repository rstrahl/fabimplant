// main.js
//
// Sets up the application for use in a browser window. Expects there to be
// a single div element with the id 'main' for drag-n-drop functionality.

import * as fileLoader from './fileLoader';
import * as sidebar from './sidebar';
import * as renderer from './renderer';
import * as processor from './processor';

const mainElement = 'main';
const debug = true;

window.addEventListener('load', () => {
	let element = document.querySelector(mainElement);
	if (element != undefined) {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
  		element.addEventListener('dragover', handleDragOver, false);
  		element.addEventListener('drop', handleFileSelect, false);
  	}
  	else {
  		alert("File APIs are not supported in this browser.");
  	}
	} else {
		console.error("main element undefined!");
	}
});

// TODO: Refactor this into a navbar script... or something.
document.getElementById('header-button-debug').onclick = () => {
	let e = document.getElementById('sidebar-metadata');
	e.style.display = (window.getComputedStyle(e).display == 'block') ? 'none' : 'block';
};

function handleFileSelect(event) {
	event.stopPropagation();
	event.preventDefault();
	let files = event.dataTransfer.files;
	if (files.length > 0) {
		attachDebugSidebar();
		fileLoader.loadFile(files[0])
    	.then( dataSet => {
    		let imageData = processor.processDataSet(dataSet);
			let canvas = document.getElementById('dicom-canvas');
			renderer.render(canvas, imageData);

			let sidebarDiv = document.getElementById('sidebar-metadata');
			sidebar.populateSidebar(sidebarDiv, dataSet);
		})
    	.catch( err => console.error(error) );
	}
		
	/*
		Load, parse, and render all files into their respective canvas ImageData objects.
		On completion, fire callback with ImageData array.
		Main stores the ImageData array and passes a default index object into the canvas.
		Controls cycle through each of the array elements.
	*/
	// for (let file of files) {
		
	// }
}

function handleDragOver(event) {
	event.stopPropagation();
	event.preventDefault();
	event.dataTransfer.dropEffect = 'copy';
}

function attachDebugSidebar() {
	if (debug === true) {
		let sidebarDiv = document.getElementById('sidebar-metadata');
		if (sidebarDiv == undefined) {
			sidebarDiv = document.createElement('div');
			sidebarDiv.setAttribute('class', 'sidebar');
			sidebarDiv.setAttribute('id', 'sidebar-metadata');
			sidebarDiv.style.display = 'none';
			document.querySelector('main').appendChild(sidebarDiv);
		}
	}
}
