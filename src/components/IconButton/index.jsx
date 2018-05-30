import React from 'react';
import styles from './style.less';
import Icon from '../Icon';
import { bind } from 'decko';

export default class IconButton extends React.Component {

	render() {
		let { icon } = this.props;
		return (
			<div style={this.props.styling} className={styles.iconButton} onClick={this.handleOnClick}>
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
	styling : React.PropTypes.object,
	onClick: React.PropTypes.func
};
IconButton.defaultProps = {
	icon: '',
	styling: null,
	onClick: null
};
