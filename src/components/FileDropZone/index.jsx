import React from 'react';
import styles from './style.less';

/** A UI component that provides a drag-n-drop area for Files.
 *
 * Requires that a file loader object be passed in via props.
 */
export default class FileDropZone extends React.Component {

	render() {
		let { text } = this.props;
		return (
			<div className={styles.fileDropZone}>
				<span className={styles.text}>{text}</span>
			</div>
		);
	}

}

FileDropZone.propTypes = {
	text : React.PropTypes.string
};
FileDropZone.defaultProps = {
	text : '(undefined)'
};
