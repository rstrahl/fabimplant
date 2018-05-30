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
				<tbody className={styles.body}>
					<tr>
						<th>Patient</th>
						<td>{dicomFile.getPatientName().replace(/[^a-zA-Z0-9\,\'\-\.]/g,' ')}</td>
					</tr>
					<tr>
						<th>Scan Date</th>
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
