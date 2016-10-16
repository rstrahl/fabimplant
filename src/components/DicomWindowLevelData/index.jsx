import React from 'react';
import { bind } from 'decko';
import styles from './style.less';
import BoundedRangeInput from '../BoundedRangeInput';

/** A UI component that displays and controls DICOM Window Width and Center.
 */
export default class DicomWindowLevelData extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			center: props.windowCenter,
			width: props.windowWidth
		};
	}

	render() {
		let { center, width } = this.state;
		let range = this.toRange({ center, width });
		return (
			<div className={styles.container}>
				<div className={styles.title}>
					Window Level
				</div>
				<div className={styles.control}>
					<BoundedRangeInput
						vertical
						value={range}
						onInput={this.handleRangeChanged}>
					</BoundedRangeInput>
					<div className={styles.value}>
						C: {center}
					</div>
					<div className={styles.value}>
						W: {width}
					</div>
				</div>
			</div>
		);
	}

	@bind
	handleRangeChanged({ value }) {
		let { center, width } = this.toCenterWidth(value);
		this.setState({ center, width });
		this.props.handleChange({ center, width });
	}

	@bind
	handleWindowWidthChanged(event) {
		this.props.handleWindowWidthChanged(event.target.valueAsNumber);
	}

	@bind
	handleWindowCenterChanged(event) {
		this.props.handleWindowCenterChanged(event.target.valueAsNumber);
	}

	@bind
	toCenterWidth({ min, max }) {
		let { maxWindowWidth } = this.props;
		return {
			center: Math.round(((min + max) / 2) * maxWindowWidth),
			width: Math.round((max - min) * maxWindowWidth)
		};
	}

	@bind
	toRange({ center, width }) {
		let { maxWindowWidth } = this.props;
		return {
			min: (center - (width / 2)) / maxWindowWidth,
			max: (center + (width / 2)) / maxWindowWidth
		};
	}
}

DicomWindowLevelData.propTypes = {
	windowWidth : React.PropTypes.number,
	windowCenter : React.PropTypes.number
};
DicomWindowLevelData.defaultProps = {
	windowWidth : 0,
	windowCenter : 0
};
