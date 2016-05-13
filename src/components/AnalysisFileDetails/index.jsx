import React from 'react';
import styles from './style.less';

export default class AnalysisFileDetails extends React.Component {

	render() {
		return (
			<table className={styles.analysisFileDetails}>
				<tr>
					<th>Implants</th>
					<td></td>
				</tr>
			</table>
		);
	}
}

AnalysisFileDetails.propTypes = {};
AnalysisFileDetails.defaultProps = {};
