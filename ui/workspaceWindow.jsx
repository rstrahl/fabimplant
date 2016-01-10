// workspaceWindow.js
//
// A UI container that displays a workspace area and navigation controls for
// moving between workspace stages.

import React from 'react';
import NavigationFooter from './navigationFooter.jsx';
import ImageWindow from './imageWindow.jsx';

/**
 * A UI container that displays a workspace area and navigation controls for
 * moving between workspace stages.
 */
export default class WorkspaceWindow extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="workspace-window">
				<div className="workspace-window-main">
					<ImageWindow />
				</div>
				<div className="workspace-window-nav">
					<NavigationFooter handleNavigationUpdate={this.handleNavigationDidChange.bind(this)}/>
				</div>
			</div>
		);
	}

	/**
	 * Callback that handles when the NavigationFooter changes the
	 * current workspace stage.
	 */
	handleNavigationDidChange(value) {
		/*
		Moves forward and backward through a list of stages

		- need an array of stages
		- each stage is represented by a sub-window component
		- will need transition effects
		- each stage needs a title; attach to component

		 */
		console.log('Navigation change value: '+value);
	}

}
