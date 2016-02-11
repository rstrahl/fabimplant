// main.js
//
// Sets up the application for use in a browser window. Expects there to be
// a single div element with the id 'main' for drag-n-drop functionality.

'use-strict';

import React from 'react';
import ReactDOM from 'react-dom';
import MainWindow from './ui/mainWindow.jsx';

// UI
let main = React.createElement(MainWindow, null);
ReactDOM.render(
	main,
	document.querySelector('main')
);
