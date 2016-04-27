import React from 'react';
import DicomDebugTable from './DicomDebugTable';
import { bind } from 'decko';

/**
 * A container UI component that presents a DicomDebugTable component as a div with
 * a button that can be used to manage the presentation (visible/not).
 */
export default class DicomDebugWindow extends React.Component {

	render() {
		let { dataSet } = this.props;

		return (
			<div className="dicom-debug-window">
				<DicomDebugTable dataSet={dataSet} />
				<button className="dicom-debug-window-button" id="dicom-debug-window-button-close" type="button"
					onClick={this.handleCloseWindow}>X</button>
			</div>
		);
	}

	@bind
	handleCloseWindow() {
		this.props.handleCloseWindow();
	}

}

DicomDebugWindow.propTypes = {
	dataSet : React.PropTypes.object,
	title : React.PropTypes.string,
	handleCloseWindow : React.PropTypes.func
};
DicomDebugWindow.defaultProps = {
	dataSet : null,
	title : "(undefined)",
	handleCloseWindow : null
};
