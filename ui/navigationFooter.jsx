// navigationFooter.jsx
//
// A UI component that displays a forward/backward-style navigation control.

import React from 'react';

/**
 * A UI component that displays a forward/backward-style navigation control.
 */
export default class navigationFooter extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div id="navigation-footer" className="navigation-footer">
				<div className="navigation-footer-left" onClick={this.handleLeftClick.bind(this)}>left</div>
				<div className="navigation-footer-right" onClick={this.handleRightClick.bind(this)}>right</div>
				<div className="navigation-footer-middle" onClick={this.handleMiddleClick.bind(this)}>middle</div>
			</div>
		);
	}

	handleLeftClick() {
		console.log('Left navigation item clicked');
		this.props.handleNavigationUpdate('Left');
	}

	handleMiddleClick() {
		console.log('Middle navigation item clicked');
		this.props.handleNavigationUpdate('Middle');
	}

	handleRightClick() {
		console.log('Right navigation item clicked');
		this.props.handleNavigationUpdate('Right');
	}

}
