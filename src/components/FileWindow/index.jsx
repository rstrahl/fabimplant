import React from 'react';
import styles from './style.less';
import FileDropZone from '../FileDropZone';

/** A UI component that presents and coordinates all file-loading stage components.
 *
 */
export default class FileWindow extends React.Component {

	render() {
		return (
			<div className={styles.fileWindow}>
				<FileDropZone text="Drag-n-drop DICOM files here"/>
			</div>
		);
	}

}

FileWindow.propTypes = {};
FileWindow.defaultProps = {};
