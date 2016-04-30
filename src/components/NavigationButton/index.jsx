import React from 'react';
import { bind } from 'decko';
import styles from './style.less';

/**
 * Dictates the styling of the button div in terms of its alignment within the
 * NavigationFooter.
 *
 * @type {Object}
 */
export const BUTTON_ALIGNMENT = {
	MIDDLE : 'middle',
	LEFT : 'left',
	RIGHT : 'right'
};

/** A button component used in the NavigationFooter.
 * Presents a text label and an SVG icon.
 */
export default class NavigationButton extends React.Component {

	render() {
		let { label, align } = this.props;
		return (
			<div className={styles[align]} onClick={this.handleOnClick}>{label}</div>
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
