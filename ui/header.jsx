// header.js
//
// The main header bar.
//

import React from 'react';

export default class Header extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		return (

			<div className="header">
				<span className="header-title">
					FABIMPLANT
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
