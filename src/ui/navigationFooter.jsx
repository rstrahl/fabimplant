// navigationFooter.jsx
//
// A UI component that displays a forward/backward-style navigation control.

import React from 'react';
import { bind } from 'decko';

/**
 * A UI component that displays a forward/backward-style navigation control.
 */
export default class NavigationFooter extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div id="navigation-footer" className="navigation-footer">
				<div className="navigation-footer-left" onClick={this.handleLeftClick}>left</div>
				<div className="navigation-footer-right" onClick={this.handleRightClick}>right</div>
				<div className="navigation-footer-middle" onClick={this.handleMiddleClick}>middle</div>
			</div>
		);
	}

	@bind
	handleLeftClick() {
		this.props.handleNavigationUpdate(-1);
	}

	@bind
	handleMiddleClick() {
		this.props.handleNavigationUpdate(0);
	}

	@bind
	handleRightClick() {
		this.props.handleNavigationUpdate(+1);
	}

}
