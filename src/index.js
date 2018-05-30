// main.js
//
// Sets up the application for use in a browser window. Expects there to be
// a single div element with the id 'main' for drag-n-drop functionality.

'use-strict';

import React from 'react';
import ReactDOM from 'react-dom';
import './style.css';

let root = document.querySelector('main');
function init() {
	let App = require('./components/App');
	ReactDOM.render(<App />, root);
}
init();

if (module.hot) {
	module.hot.accept('./components/App', () => {
		requestAnimationFrame(init);
	});
}
