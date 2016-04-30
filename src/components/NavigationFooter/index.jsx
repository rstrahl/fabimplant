import React from 'react';
import { bind } from 'decko';
import styles from './style.less';
import { default as NavigationButton, BUTTON_ALIGNMENT } from '../NavigationButton';

/**
 * A footer-style component that presents two buttons for navigating the Workspace
 * forward and backward.
 */
export default class NavigationFooter extends React.Component {

	render() {
		return (
			<div id="navigationFooter" className={styles.navigationFooter}>
				<NavigationButton align={BUTTON_ALIGNMENT.LEFT} label="left" onClick={this.handleLeftClick} />
				<NavigationButton align={BUTTON_ALIGNMENT.RIGHT} label="right" onClick={this.handleRightClick} />
				<NavigationButton align={BUTTON_ALIGNMENT.MIDDLE} label="middle" onClick={this.handleMiddleClick} />
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

NavigationFooter.propTypes = {
	handleNavigationUpdate : React.PropTypes.func
};

NavigationFooter.defaultProps = {
	handleNavigationUpdate : null
};
