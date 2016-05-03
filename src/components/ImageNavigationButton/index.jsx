import React from 'react';
import styles from './style.less';
import { bind } from 'decko';

/** A button that calls a callback in the ImageNavigationControl when clicked.
 */
export default class ImageNavigationButton extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className={styles.button} onClick={this.handleButtonClick}>
				{this.props.label}
			</div>
		);
	}

	@bind
	handleButtonClick() {
		this.props.handleButtonClick(this.props.indexModifier);
	}
}

ImageNavigationButton.propTypes = {
	label : React.PropTypes.string,
	indexModifier : React.PropTypes.number,
	handleButtonClick : React.PropTypes.func
};
ImageNavigationButton.defaultProps = {
	label : '(undefined)',
	indexModifier : 0,
	handleButtonClick : null
};
