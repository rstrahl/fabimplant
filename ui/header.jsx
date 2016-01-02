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

			<div>
				<span id="header-title-container">
					DICOM Project
				</span>
				<span id="header-button-container">
					<span className="header-button">
						<span id="header-button-debug">Debug</span>
					</span>
				</span>
			</div>

		);
	}
}
