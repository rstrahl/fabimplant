import React from 'react';
import styles from './style.less';
import Icon from '../Icon';
import { bind } from 'decko';

export default class IconButton extends React.Component {

	render() {
		let { icon } = this.props;
		return (
			<div className={styles.iconButton} onClick={this.handleOnClick}>
				<Icon name={icon} />
			</div>
		);
	}

	@bind
	handleOnClick(e) {
		console.log(`${this.constructor.name} ${this.props.icon} clicked`);
		this.props.onClick(e);
	}

}

IconButton.propTypes = {
	icon: React.PropTypes.string,
	onClick: React.PropTypes.func
};
IconButton.defaultProps = {
	icon: '',
	onClick: null
};
