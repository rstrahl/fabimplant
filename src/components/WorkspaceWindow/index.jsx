import React from 'react';
import { bind } from 'decko';
import styles from './style.less';
import NavigationFooter from '../NavigationFooter';
import FileWindow from '../FileWindow';
import ImageWindow from '../ImageWindow';
import ThreeWindow from '../ThreeWindow';
import TestWindow from '../TestWindow';

/** A UI component that presents a workspace stage and navigation controls.
 */
export default class WorkspaceWindow extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			index: 0,
			stageWindows: [FileWindow, ImageWindow, ThreeWindow, TestWindow],
			session: props.session
		};
	}

	render() {
		let { stageWindows, index, session } = this.state;
		let StageWindow = stageWindows[index];

		return (
			<div className={styles.workspace} onDragOver={this.handleDragOver} onDrop={this.handleDrop}>
				<StageWindow session={session} handleSessionChanged={this.handleSessionChanged}/>
				<NavigationFooter handleNavigationUpdate={this.handleNavigationDidChange}/>
			</div>
		);
	}

	@bind
	handleNavigationDidChange(newIndex) {
		if (newIndex < 0) {
			this.setState({index: 0});
		} else if (newIndex >= this.state.stageWindows.length) {
			this.setState({index:this.state.stageWindows.length - 1});
		} else {
			this.setState({index: newIndex});
		}
	}

	// TODO: Refactor this into the magical redux framework/architecture
	@bind
	handleSessionChanged(session) {
		this.setState({ session });
	}

}

WorkspaceWindow.propTypes = {
	session: React.PropTypes.object
};

WorkspaceWindow.defaultProps = {
	session: null
};
