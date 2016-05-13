import React from 'react';
import styles from './style.less';
import FileInputButton from '../FileInputButton';
import { bind } from 'decko';

/** A UI component that presents an input button for loading files.
 */
export default class FileInputForm extends React.Component {

	render() {
		return (
			<div className={styles.fileInputBox}>
				<input className={styles.fileInputForm} type="file" id="file" multiple onChange={this.handleFileChange} />
				<div className={styles.fileInputButtonBox}>
					<FileInputButton formId="file"/>
				</div>
			</div>
		);
	}

}

FileInputForm.propTypes = {
};
FileInputForm.defaultProps = {
};
