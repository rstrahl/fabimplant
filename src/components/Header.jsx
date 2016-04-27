import React from 'react';

/**
 * A component that presents a header bar.
 */
export default class Header extends React.Component {

	render() {
		let { title } = this.props;

		return (
			<div className="header">
				<span className="header-title">
					{title}
				</span>
				<span className="header-button-container">
					<span className="header-button">
						Account
					</span>
					<span className="header-button">
						Help
					</span>
				</span>
			</div>
		);
	}
}

Header.propTypes = {
	title : React.PropTypes.string
};
Header.defaultProps = {
	title : "(undefined)"
};
