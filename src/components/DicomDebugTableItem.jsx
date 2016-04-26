import React from 'react';

/**
 * A component that presents a table row of two cells for displaying a property and
 * associated value.
 */
export default class DicomDebugTableItem extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		return (
			<tr>
				<td className="dicom-debug-window-table-property">{this.props.element}</td>
				<td className="dicom-debug-window-table-value">{this.props.value}</td>
			</tr>
		);
	}

}

DicomDebugTableItem.propTypes = {
	element : React.PropTypes.string,
	value : React.PropTypes.string
};
DicomDebugTableItem.defaultProps = {
	element : "(undefined)",
	value : "(undefined)"
};
