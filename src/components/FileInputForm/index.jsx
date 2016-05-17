import React from 'react';
import styles from './style.less';
import FileInputButton from '../FileInputButton';
import {bind} from 'decko';
import classNames from 'classnames/bind';

let cx = classNames.bind(styles);

/** A UI component that presents an input button for loading files.
 */
export default class FileInputForm extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			dragging: false
		};
	}

	render() {
		const {formId} = this.props;
		const fileInputBoxClassName = cx({dragging: this.state.dragging, fileInputBox: true});
		return (
			<div
				className={fileInputBoxClassName}
				onDragEnter={this.handleDragEnter}
				onDragOver={this.handleDragEnter}
				onDragLeave={this.handleDragLeave}
				onDrop={this.handleDrop}>
				<input className={styles.fileInputForm} type="file" id={formId} multiple onChange={this.handleFileChange}/>
				<FileInputButton formId={formId}/>
			</div>
		);
	}

	@bind
	handleDragEnter(e) {
		e.stopPropagation();
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
		this.setState({dragging: true});
	}

	@bind
	handleDragLeave(e) {
		e.stopPropagation();
		e.preventDefault();
		this.setState({dragging: false});
	}

	@bind
	handleDrop(e) {
		e.stopPropagation();
		e.preventDefault();
		this.setState({dragging: false});
		const fileList = e.dataTransfer.files;
		this.props.onFileLoaded(fileList);
	}

	@bind
	handleFileChange(e) {
		const fileList = e.target.files;
		this.props.onFileLoaded(fileList);
	}

}

FileInputForm.propTypes = {
	formId: React.PropTypes.string,
	onFileLoaded: React.PropTypes.func
};
FileInputForm.defaultProps = {
	formId: '',
	onFileLoaded: null
};
