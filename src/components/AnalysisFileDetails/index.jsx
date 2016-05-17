import React from 'react';
import {bind} from 'decko';
import styles from './style.less';
import AnalysisFileTableRow from '../AnalysisFileTableRow';
import FileInputForm from '../FileInputForm';

const COLUMNS = 6;

/** A UI component that presents data parsed from an Analysis file.
 *
 */
export default class AnalysisFileDetails extends React.Component {

	render() {
		const {implantsFile} = this.props;
		let tableContents = implantsFile === null
			? <tbody>
				<tr>
					<td colSpan={COLUMNS}>
						<div className={styles.spanRow}>
							<FileInputForm onFileLoaded={this.loadAnalysisFile}/>
						</div>
					</td>
				</tr>
			</tbody>
			: this.buildImplantRows(implantsFile.implants);
		return (
			<table className={styles.implantTable}>
				{tableContents}
			</table>
		);
	}

	@bind
	buildImplantRows(implants) {
		let rows = [];
		for (const implant of implants) {
			rows.push(new AnalysisFileTableRow(implant));
		}
		return rows.length > 0
			? <tbody>
				<tr>
					<th>#</th>
					<th>Type</th>
					<th>Length (mm)</th>
					<th>Top Radius (mm)</th>
					<th>Bottom Radius (mm)</th>
					<th></th>
				</tr>
				{rows}
			</tbody>
			: <tbody>
				<tr>
					<td colSpan={COLUMNS}>
						<div className={styles.spanRow}>
							No implants found...
							<FileInputForm onFileLoaded={this.loadAnalysisFile}/>
						</div>
					</td>
				</tr>
			</tbody>;
	}

	@bind
	loadAnalysisFile(fileList) {
		this.props.onFileLoaded(fileList);
	}
}

AnalysisFileDetails.propTypes = {
	implantsFile : React.PropTypes.object,
	onFileLoaded : React.PropTypes.func
};
AnalysisFileDetails.defaultProps = {
	implantsFile : null,
	onFileLoaded : null
};
