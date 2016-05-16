import React from 'react';
import styles from './style.less';

export default class DicomFileDetails extends React.Component {

	render() {
		const { dicomFile } = this.props;
		/*
		- Show warning icon in the count if imageCount !== imageTotal
		- Add button for adding more files
		 */
		return (
			<table className={styles.dicomTable}>
				<thead>
					<tr>
						<td colSpan="2">Patient</td>
					</tr>
				</thead>
				<tbody>
					<tr>
						<th>Name</th>
						<td>{dicomFile.getPatientName()}</td>
					</tr>
					<tr>
						<th>Date</th>
						<td>{dicomFile.getAcquisitionDate()}</td>
					</tr>
					<tr>
						<th>Images</th>
						<td>{dicomFile.pixelArrays.length}</td>
					</tr>
				</tbody>
			</table>
		);
	}

}

DicomFileDetails.propTypes = {
	dicomFile : React.PropTypes.object,
	fileCount : React.PropTypes.number
};
DicomFileDetails.defaultProps = {
	dicomFile : null,
	fileCount : 0
};
