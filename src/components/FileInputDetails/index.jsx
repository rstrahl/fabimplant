import React from 'react';
import styles from './style.less';
import DicomFileDetails from '../DicomFileDetails';
import AnalysisFileDetails from '../AnalysisFileDetails';

export default class FileInputDetails extends React.Component {

	render() {
		const { dicomFile, analysisFile } = this.props;
		return (
			<div className={styles.fileInputDetails}>
				<DicomFileDetails dicomFile={dicomFile} />
				<AnalysisFileDetails analysisFile={analysisFile} />
			</div>
		);
	}

}

FileInputDetails.propTypes = {
	dicomFile : React.PropTypes.object,
	analysisFile : React.PropTypes.object
};
FileInputDetails.defaultProps = {
	dicomFile : null,
	analysisFile : null
};
