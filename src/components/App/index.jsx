import React from 'react';
import styles from './style.less';
import Header from '../Header';
import WorkspaceWindow from '../WorkspaceWindow';

export default class App extends React.Component {

	render() {
		return (
			<div className={styles.app}>
				<div className={styles.header}>
					<Header title="FABIMPLANT" />
				</div>
				<div className={styles.workspace}>
					<WorkspaceWindow/>
				</div>
			</div>
		);
	}

}

App.propTypes = {};
App.defaultProps = {};
