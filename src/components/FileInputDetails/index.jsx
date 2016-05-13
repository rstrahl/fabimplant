import React from 'react';
import styles from './style.less';
import Icon from '../Icon';

export default class FileInputDetails extends React.Component {

	render() {
		/*
		- Show warning icon in the count if imageCount !== imageTotal
		 */
		const imageCount = 0, imageTotal = 100, imageFormat = 'Undefined', imageWidth = 0, imageHeight = 0;
		return (
			<table className={styles.fileInputDetails}>
				<tr>
					<th>Image Count</th>
					<td>{imageCount} / {imageTotal}</td>
				</tr>
				<tr>
					<th>Image Format</th>
					<td>{imageFormat}</td>
				</tr>
				<tr>
					<th>Image Dimensions</th>
					<td>{imageWidth} (w) x {imageHeight} (h)</td>
				</tr>
			</table>
		);
	}

}
