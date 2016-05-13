import React from 'react';
import styles from './style.less';
import FileInputForm from '../FileInputForm';
import FileInputDetails from '../FileInputDetails';

/** A UI component that presents and coordinates all file-loading stage components.
 *
 */
export default class FileWindow extends React.Component {

	render() {
		const { dicomFile } = this.props;
		return (
			<div className={styles.fileWindow}>
				{ dicomFile === null
					? <FileInputForm />
					: <FileInputDetails dicomFile={dicomFile} />
				}
			</div>
		);
	}

}

FileWindow.propTypes = {
	dicomFile : React.PropTypes.object
};
FileWindow.defaultProps = {
	dicomFile : null
};
