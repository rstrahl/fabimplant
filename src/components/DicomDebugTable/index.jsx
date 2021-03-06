import React from 'react';
import styles from './style.less';
import DicomDebugTableItem from '../DicomDebugTableItem';
import { dicomDataDictionary } from '../../lib/dicom/dataDictionary';
import { uids } from '../../lib/dicom/uids';

/**
 * A component that presents DICOM metadata in a table structure.
 */
export default class DicomDebugTable extends React.Component {

	render() {
		let rows = [];
		Object.keys(this.props.dataSet).forEach( key => {
			let checkedKey = (dicomDataDictionary[key] !== undefined) ? dicomDataDictionary[key].name : key;
			let value = uids[this.props.dataSet[key]] || this.props.dataSet[key].toString();
			rows.push(<DicomDebugTableItem key={key} element={checkedKey} value={value} />);
		});

		return (
			<table className={styles.table}>
				<tbody className={styles.body}>
					{rows}
				</tbody>
			</table>
		);
	}

}

DicomDebugTable.propTypes = {
	dataSet : React.PropTypes.object
};

DicomDebugTable.defaultProps = {
	dataSet : null
};
