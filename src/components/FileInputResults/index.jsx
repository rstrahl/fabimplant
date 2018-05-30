import React from 'react';
import styles from './style.less';
import FileInputForm from '../FileInputForm';
import DicomFileDetails from '../DicomFileDetails';
import AnalysisFileDetails from '../AnalysisFileDetails';

/** A UI component that manages the state of a FileInputForm.
 *
 * The state of the component is either no file has been loaded, wherein it
 * presents a fileInputForm, or that a file was loaded and the results must
 * either be accepted or rejected.  The results decision is communicated back
 * to the FileWindow.
 */
export default class FileInputResults extends React.Component {

	render() {
		const {dicomFile, implantFile} = this.props;
		const warnings = null;
		return (
			<div className={styles.fileInputResults}>
				<div className={styles.header}>
					Import Files
					<hr className={styles.headerRule}/>
				</div>
				<table className={styles.table}>
					<tbody className={styles.body}>
						<tr>
							<th>DICOM</th>
							<td>{dicomFile === null
									? <FileInputForm formId="dicom" onFileLoaded={this.props.onLoadDicomFiles}/>
									: <DicomFileDetails dicomFile={dicomFile}/>}</td>
							<td>X</td>
						</tr>
						<tr>
							<th>Implants</th>
							<td>{implantFile === null
									? <FileInputForm formId="implants" onFileLoaded={this.props.onLoadImplantFiles}/>
									: <AnalysisFileDetails implantFile={implantFile}/>}</td>
							<td>X</td>
						</tr>
					</tbody>
				</table>
				{/*<div className={styles.footer}>
					<hr className={styles.headerRule}/>
					(warnings go here?)
				</div>*/}
			</div>
		);
	}

}

FileInputResults.propTypes = {
	dicomFile: React.PropTypes.object,
	implantFile: React.PropTypes.object,
	onLoadDicomFiles: React.PropTypes.func,
	onLoadImplantFiles: React.PropTypes.func
};
FileInputResults.defaultProps = {
	dicomFile: null,
	implantFile: null,
	onLoadDicomFiles: null,
	onLoadImplantFiles: null
};
