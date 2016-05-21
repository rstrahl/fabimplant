import React from 'react';
import {bind} from 'decko';
import styles from './style.less';
import AnalysisFileTableRow from '../AnalysisFileTableRow';
import FileInputForm from '../FileInputForm';

const COLUMNS = 5;

/** A UI component that presents data parsed from an Analysis file.
 */
export default class AnalysisFileDetails extends React.Component {

	render() {
		const {implantFile} = this.props;
		let tableContents = implantFile === null
			? <tbody>
				<tr>
					<td colSpan={COLUMNS}>
						<div className={styles.spanRow}>
							<FileInputForm onFileLoaded={this.loadAnalysisFile}/>
						</div>
					</td>
				</tr>
			</tbody>
			: this.buildImplantRows(implantFile.implants);
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
			rows.push(<AnalysisFileTableRow key={implant.id} implant={implant} />);
		}
		return rows.length > 0
			? <tbody>
				<tr>
					<th>ID</th>
					<th>Type</th>
					<th>Length</th>
					<th>Top</th>
					<th>Bottom</th>
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
	implantFile : React.PropTypes.object,
	onFileLoaded : React.PropTypes.func
};
AnalysisFileDetails.defaultProps = {
	implantFile : null,
	onFileLoaded : null
};
