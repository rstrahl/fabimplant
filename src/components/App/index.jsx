import React from 'react';
import styles from './style.less';
import Header from '../Header';
import WorkspaceWindow from '../WorkspaceWindow';

export default class App extends React.Component {

	render() {
		return (
			<div className={styles.app}>
				<Header />
				<WorkspaceWindow/>
			</div>
		);
	}

}

App.propTypes = {};
App.defaultProps = {};
