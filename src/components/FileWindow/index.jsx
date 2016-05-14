import React from 'react';
import styles from './style.less';
import { bind } from 'decko';
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
					? <FileInputForm onFileLoaded={this.onFileLoaded}/>
					: <FileInputDetails dicomFile={dicomFile} />
				}
			</div>
		);
	}

	@bind
	onFileLoaded(file) {
		this.props.handleFileLoaded(file);
	}

}

FileWindow.propTypes = {
	dicomFile : React.PropTypes.object,
	handleFileLoaded : React.PropTypes.func
};
FileWindow.defaultProps = {
	dicomFile : null,
	handleFileLoaded : null
};
