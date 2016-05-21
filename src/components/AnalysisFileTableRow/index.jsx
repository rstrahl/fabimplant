import React from 'react';
import styles from './style.less';

/** A UI component that presents data about an Implant.
 *
 */
export default class AnalysisFileTableRow extends React.Component {

	render() {
		let { id, manufacturerName, modelName, length, topRadius, bottomRadius } = this.props.implant;
		return (
			<tr className={styles.row}>
				<td>
					{id}
				</td>
				<td className={styles.titleCell}>
					{manufacturerName} {modelName}
				</td>
				<td>
					{length}
				</td>
				<td>
					{topRadius}
				</td>
				<td>
					{bottomRadius}
				</td>
			</tr>
		);
	}

}

AnalysisFileTableRow.propTypes = {
	implant : React.PropTypes.object
};
AnalysisFileTableRow.defaultProps = {
	implant : {}
};
