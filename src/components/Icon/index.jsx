import React from 'react';
import styles from './style.less';
import classNames from 'classnames/bind';

let cx = classNames.bind(styles);

export default class Icon extends React.Component {

	render() {
		let { name, onClick } = this.props;
		let className = cx({ [`icon-${name}`] : true });
		return (
			<span className={className} onClick={onClick}></span>
		);
	}

}

Icon.propTypes = {
	name: React.PropTypes.string,
	onClick: React.PropTypes.func
};
Icon.defaultProps = {
	name: "",
	onClick: null
};
