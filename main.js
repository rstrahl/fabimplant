// main.js
//
// Sets up the application for use in a browser window. Expects there to be
// a single div element with the id 'main' for drag-n-drop functionality.

import * as fileLoader from './fileLoader';
import * as sidebar from './sidebar';
import * as renderer from './renderer';

const mainElement = 'main';

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
	fileLoader.loadFile(files[0])
    .then( dataSet => {
			let container = document.querySelector(mainElement);

			let div = document.createElement('div');
			div.setAttribute('id', 'canvas-container');
			let canvas = configureCanvas();
			div.appendChild(canvas);
			container.appendChild(div);
			renderer.render(canvas, dataSet);

			let sidebarDiv = sidebar.populateSidebar(dataSet);
			container.appendChild(sidebarDiv);
		})
    .catch( err => console.error(error) );
}

function handleDragOver(event) {
	event.stopPropagation();
	event.preventDefault();
	event.dataTransfer.dropEffect = 'copy';
}

function configureCanvas() {
	let canvas = document.createElement('canvas');
	canvas.setAttribute('id', 'dicom-canvas');
	return canvas;
}
