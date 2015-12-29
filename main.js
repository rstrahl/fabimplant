// main.js
//
// Sets up the application for use in a browser window. Expects there to be
// a single div element with the id 'main' for drag-n-drop functionality.

'use-strict';

import * as fileLoader from './fileLoader';
import * as sidebar from './sidebar';
import * as renderer from './renderer';
import * as processor from './processor';
import Promise from 'promise';
import React from 'react';
import ReactDOM from 'react-dom';
import Header from './ui/header.jsx';

const mainElement = 'main';
const debug = true;

let dicomDataSets = [];
let dicomImages = [];
let currentImageIndex = 0; // TODO: Move into React renderer component

ReactDOM.render(
	React.createElement(Header, null),
	document.querySelector('main')
);

window.addEventListener('load', () => {
	let element = document.querySelector(mainElement);
	if (element != undefined) {
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
	e.style.display = (window.getComputedStyle(e).display == 'block') ? 'none' : 'block';
};

function handleFileSelect(event) {
	event.stopPropagation();
	event.preventDefault();
	let files = event.dataTransfer.files;
	if (files.length > 0) {
		attachDebugSidebar();

		/*
		Load, parse, and render all files into their respective canvas ImageData objects.
		On completion, fire callback with ImageData array.
		Main stores the ImageData array and passes a default index object into the canvas.
		Controls cycle through each of the array elements.
		*/

		fileLoader.loadFiles(Array.from(files))
		.then( dataSets => {
			dicomDataSets = dataSets;

			Promise.all(dataSets.map( dataSet => processor.processDataSet(dataSet) ))
			.then( imageDatas => {
				dicomImages = imageDatas;
				let canvas = document.getElementById('dicom-canvas');
				renderer.render(canvas, dicomImages[currentImageIndex]);
				let sidebarDiv = document.getElementById('sidebar-metadata');
				sidebar.populateSidebar(sidebarDiv, dicomDataSets[0]);

				createImageNavButtons();
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

// Image Review Navigation ---
function createImageNavButtons() {
	let imageUpButton = document.createElement('div');
	imageUpButton.onclick = onImageUpButtonPressed;
	imageUpButton.style.background = '#FFFFFF';
	imageUpButton.appendChild(document.createTextNode('+'));

	let imageDownButton = document.createElement('div');
	imageDownButton.style.background = '#FFFFFF';
	imageDownButton.onclick = onImageDownButtonPressed;
	imageDownButton.appendChild(document.createTextNode('-'));

	let buttonDiv = document.createElement('div');
	buttonDiv.appendChild(imageUpButton);
	buttonDiv.appendChild(imageDownButton);
	document.querySelector('main').appendChild(buttonDiv);
}

function onImageUpButtonPressed() {
	if (currentImageIndex < dicomImages.length-1) {
		currentImageIndex += 1;
		let canvas = document.getElementById('dicom-canvas');
		renderer.render(canvas, dicomImages[currentImageIndex]);
	}
}

function onImageDownButtonPressed() {
	if (currentImageIndex > 0) {
		currentImageIndex -= 1;
		let canvas = document.getElementById('dicom-canvas');
		renderer.render(canvas, dicomImages[currentImageIndex]);
	}
}
// ---
