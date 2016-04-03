// main.js
//
// Sets up the application for use in a browser window. Expects there to be
// a single div element with the id 'main' for drag-n-drop functionality.

'use-strict';

import React from 'react';
import ReactDOM from 'react-dom';
import MainWindow from './ui/mainWindow.jsx';

let root = document.querySelector('main');
ReactDOM.render(<MainWindow />, root);

if (module.hot) {
	module.hot.accept('./ui/mainWindow.jsx', () => {
		let NextMain = require('./ui/mainWindow.jsx');
		ReactDOM.render(<NextMain />, root);
	});
}
