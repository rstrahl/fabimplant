// MainWindow.jsx
//
// The main application window for FabImplant.

import React from 'react';
import Header from './Header.jsx';
import WorkspaceWindow from './WorkspaceWindow.jsx';

export default class MainWindow extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="main-window">
				<div className="main-window-header">
					<Header/>
				</div>
				<div className="main-window-workspace">
					<WorkspaceWindow/>
				</div>
			</div>
		);
	}

}
