// testWindow.jsx
//
// A test Window object used in testing Workspace Window architecture.

import React from 'react';

export default class TestWindow extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="test-window">
				This is a test window.
			</div>
		);
	}

}

TestWindow.propTypes = {};
TestWindow.defaultProps = {};
