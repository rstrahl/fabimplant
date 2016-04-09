// main.js
//
// Sets up the application for use in a browser window. Expects there to be
// a single div element with the id 'main' for drag-n-drop functionality.

'use-strict';

import React from 'react';
import ReactDOM from 'react-dom';

let root = document.querySelector('main');
function init() {
	let Main = require('./ui/mainWindow.jsx');
	ReactDOM.render(<Main />, root);
}
init();

if (module.hot) {
	module.hot.accept('./ui/mainWindow.jsx', () => {
		requestAnimationFrame(init);
	});
}
