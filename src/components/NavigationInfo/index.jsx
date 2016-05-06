import React from 'react';
import styles from './style.less';

export default class NavigationInfo extends React.Component {

	render() {
		return (
			<div className={styles.navigationInfo}>
				{this.props.title}
			</div>
		);
	}

}

NavigationInfo.propTypes = {
	title : React.PropTypes.string
};
NavigationInfo.defaultProps = {
	title : '(undefined)'
};
