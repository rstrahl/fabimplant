// workspaceWindow.js
//
// A UI container that displays a workspace area and navigation controls for
// moving between workspace stages.

import React from 'react';
import NavigationFooter from './navigationFooter.jsx';
import ImageWindow from './imageWindow.jsx';
import TestWindow from './testWindow.jsx';

/**
 * A UI container that displays a workspace area and navigation controls for
 * moving between workspace stages.
 */
export default class WorkspaceWindow extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			index: 0,
			stageWindows: [ImageWindow, TestWindow]
		};
	}

	render() {
		let { stageWindows, index } = this.state;
		let StageWindow = stageWindows[index];

		return (
			<div className="workspace-window">
				<div className="workspace-window-main">
					<StageWindow />
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
	handleNavigationDidChange(newIndex) {
		if (newIndex < 0) {
			this.setState({index: 0});
		} else if (newIndex >= this.state.stageWindows.length) {
			this.setState({index:this.state.stageWindows.length - 1});
		} else {
			this.setState({index: newIndex});
		}
	}

}
