// dicomDebugWindow.jsx
//
// Displays a table containing metadata from a DICOM File
//

import React from 'react';
import { dicomDataDictionary } from '../dataDictionary';
import { uids } from '../uids';

export default class DicomDebugWindow extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		let rows = [];
		Object.keys(this.props.dataSet).forEach( key => {
			let checkedKey = (dicomDataDictionary[key] !== undefined) ? dicomDataDictionary[key].name : key;
			let value = uids[this.props.dataSet[key]] || this.props.dataSet[key].toString();
			rows.push(<DicomDebugTableItem key={key} element={checkedKey} value={value} />);
		});
		return (
			<div className="dicom-debug-window">
				<table className="dicom-debug-window-table">
					<thead>
						<tr>
							<th colSpan="2" className="dicom-debug-window-table-header">
								{this.props.title}
							</th>
						</tr>
					</thead>
					<tbody className="dicom-debug-window-body">
						{rows}
					</tbody>
				</table>
			</div>
		);
	}

}

class DicomDebugTableItem extends React.Component {

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
