import React from 'react';
import { bind } from 'decko';

/**
 * Dictates the styling of the button div in terms of its alignment within the
 * NavigationFooter.
 *
 * @type {Object}
 */
export const BUTTON_ALIGNMENT = {
	MIDDLE : 'navigation-footer-middle',
	LEFT : 'navigation-footer-left',
	RIGHT : 'navigation-footer-right'
};

/** A button component used in the NavigationFooter.
 * Presents a text label and an SVG icon.
 */
export default class NavigationButton extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
		};
	}

	render() {
		let { label, align } = this.props;
		return (
			<div className={align} onClick={this.handleOnClick}>{label}</div>
		);
	}

	@bind
	handleOnClick(e) {
		console.log(`${this.constructor.name} ${this.props.label} clicked`);
		this.props.onClick(e);
	}

}

NavigationButton.propTypes = {
	label : React.PropTypes.string,
	icon : React.PropTypes.string,
	align : React.PropTypes.string,
	onClick : React.PropTypes.func
};

NavigationButton.defaultProps = {
	label : '',
	icon : '',
	align: 0,
	onClick: null
};
