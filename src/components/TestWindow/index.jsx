// testWindow.jsx
//
// A test Window object used in testing Workspace Window architecture.

import React from 'react';
import styles from './style.less';

export default class TestWindow extends React.Component {

	render() {
		return (
			<div className={styles.window}>
				This is a test window.
			</div>
		);
	}

}

TestWindow.propTypes = {};
TestWindow.defaultProps = {};
