import React from 'react';
import { bind } from 'decko';
import styles from './style.less';
import Icon from '../Icon';

/**
 * Dictates the styling of the button div in terms of its alignment within the
 * NavigationFooter.
 *
 * @type {Object}
 */
export const BUTTON_ALIGNMENT = {
	LEFT : 'left',
	RIGHT : 'right'
};

/** A button component used in the NavigationFooter.
 * Presents a text label and an SVG icon.
 */
export default class NavigationButton extends React.Component {

	render() {
		let { label, align } = this.props;
		let icon = (align === BUTTON_ALIGNMENT.LEFT) ? 'circle-left' : 'circle-right';
		let float = { float: align };
		return (
			<div className={styles[align]} onClick={this.handleOnClick}>
				<div className={styles.icon} style={float}>
					<Icon name={icon} />
				</div>
				<span>{label}</span>
			</div>
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
	align: BUTTON_ALIGNMENT.LEFT,
	onClick: null
};
