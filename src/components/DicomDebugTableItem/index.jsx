import React from 'react';
import styles from './style.less';

/**
 * A component that presents a table row of two cells for displaying a property and
 * associated value.
 */
export default class DicomDebugTableItem extends React.Component {

	render() {
		return (
			<tr>
				<td className={styles.property}>{this.props.element}</td>
				<td className={styles.value}>{this.props.value}</td>
			</tr>
		);
	}

}

DicomDebugTableItem.propTypes = {
	element : React.PropTypes.string,
	value : React.PropTypes.string
};
DicomDebugTableItem.defaultProps = {
	element : "(undefined)",
	value : "(undefined)"
};
