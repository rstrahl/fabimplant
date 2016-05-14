import React from 'react';
import styles from './style.less';

export default class FileInputDetails extends React.Component {

	render() {
		const { dicomFile } = this.props;
		/*
		- Show warning icon in the count if imageCount !== imageTotal
		- Add button for adding more files
		 */
		const imageCount = 0, imageTotal = 100, imageFormat = 'Undefined', imageWidth = 0, imageHeight = 0, scale = 0;
		return (
			<table className={styles.fileInputDetails}>
				<thead>
					<tr>
						<td colSpan="2">Patient</td>
					</tr>
				</thead>
				<tbody>
					<tr>
						<th>Name</th>
						<td></td>
					</tr>
					<tr>
						<th>Sex</th>
						<td></td>
					</tr>
					<tr>
						<th>D.O.B.</th>
						<td></td>
					</tr>
					<tr>
						<th>Study Date</th>
						<td></td>
					</tr>
					<tr>
						<th>Physician</th>
						<td></td>
					</tr>
				</tbody>
				<thead>
					<tr>
						<td colSpan="2">Images</td>
					</tr>
				</thead>
				<tbody>
					<tr>
						<th>Slice Count</th>
						<td>{dicomFile.pixelArrays.length} / {imageTotal}</td>
					</tr>
					<tr>
						<th>Format</th>
						<td>{imageFormat}</td>
					</tr>
					<tr>
						<th>Size</th>
						<td>{dicomFile.getImageWidth()}<sub>w</sub> x {dicomFile.getImageHeight()}<sub>h</sub></td>
					</tr>
					<tr>
						<th>Pixel Spacing</th>
						<td>{dicomFile.getPixelSpacing()} mm.</td>
					</tr>
				</tbody>
			</table>
		);
	}

}

FileInputDetails.propTypes = {
	dicomFile : React.PropTypes.object
};
FileInputDetails.defaultProps = {
	dicomFile : null
};
