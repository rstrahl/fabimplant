import React from 'react';
import styles from './style.less';
import Header from '../Header';
import WorkspaceWindow from '../WorkspaceWindow';
import Session from '../../lib/data/session';

export default class App extends React.Component {

	render() {
		const { session } = this.props;
		return (
			<div className={styles.app}>
				<Header />
				<WorkspaceWindow session={session}/>
			</div>
		);
	}

}

App.propTypes = {
	session: React.PropTypes.object
};
App.defaultProps = {
	session: new Session()
};
