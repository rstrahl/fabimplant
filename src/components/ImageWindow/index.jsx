import React from 'react';
import { bind } from 'decko';
import styles from './style.less';
import { prepareImageData, pixelValueToInterpretedValue } from '../../dicom/processor';
import ImageNavigationControl from '../ImageNavigationControl';
import ImageCanvas from '../ImageCanvas';
import DicomWindowLevelData from '../DicomWindowLevelData';
import DicomDebugWindow from '../DicomDebugWindow';

/** A UI component that displays images from a DICOM file.
 */
export default class ImageWindow extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			debugMode: false,
			imageIndex: 0,
			windowWidth: 4096,
			windowCenter: 2048
		};
	}

	componentWillUpdate(nextProps, nextState) {
		let { dicomFile } = this.props;
		if (dicomFile !== undefined && dicomFile !== null) {
			dicomFile.windowWidth = nextState.windowWidth;
			dicomFile.windowCenter = nextState.windowCenter;
		}
	}

	render() {
		let { dicomFile } = this.props;
		let { debugMode, imageIndex, windowCenter, windowWidth } = this.state;

		if (dicomFile === undefined || dicomFile === null) {
			return (
				<div className={styles.window} id="image-window"></div>
			);
		}

		// TODO: Seems like this could be refactored out into somewhere cleaner
		let pixelArray = dicomFile.pixelArrays[imageIndex],
			height = dicomFile.getImageHeight(),
			width = dicomFile.getImageWidth(),
			imageData = prepareImageData(pixelArray, width, height, windowCenter, windowWidth);

		// let interpretedCenter = pixelValueToInterpretedValue(windowCenter, dicomFile.getImageSlope(), dicomFile.getImageIntercept());
		// let interpretedWidth =  pixelValueToInterpretedValue(windowWidth, dicomFile.getImageSlope(), dicomFile.getImageIntercept());

		return (
			<div className={styles.window}>
				<div className={styles.container}>
					<button className={styles.debug} id="image-window-button-debug" type="button"
						onClick={this.handleToggleDebug}>Debug</button>
					<ImageNavigationControl
						handleImageIndexChanged={this.handleImageIndexChanged}
						currentImageIndex={imageIndex}
						imageIndexMax={dicomFile.pixelArrays.length} />
					<ImageCanvas imageData={imageData} />
					<DicomWindowLevelData
						windowCenter={windowCenter}
						windowWidth={windowWidth}
						maxWindowWidth={dicomFile.getWindowWidth()}
						handleChange={this.handleChange}
						handleWindowWidthChanged={this.handleWindowWidthChanged}
						handleWindowCenterChanged={this.handleWindowCenterChanged} />
				</div>
				{ debugMode === true
					? <DicomDebugWindow dataSet={dicomFile.getDicomMetadata()} title="Image Metadata"
						handleCloseWindow={this.handleCloseWindow} />
					: null
				}
			</div>
		);
	}

	@bind
	handleImageIndexChanged(newIndex) {
		let { dicomFile } = this.props;
		if (newIndex < 0) {
			this.setState({imageIndex: 0});
		} else if (newIndex >= dicomFile.pixelArrays.length) {
			this.setState({imageIndex:dicomFile.pixelArrays.length - 1});
		} else {
			this.setState({imageIndex: newIndex});
		}
	}

	@bind
	handleWindowWidthChanged(newWindowWidth) {
		if (newWindowWidth > 1) {
			this.setState({windowWidth: newWindowWidth});
		}
	}

	@bind
	handleWindowCenterChanged(newWindowCenter) {
		this.setState({windowCenter: newWindowCenter});
	}

	@bind
	handleChange({ center, width }) {
		if (width > 1) {
			this.setState({ windowWidth: width, windowCenter: center});
		}
	}

	@bind
	handleCloseWindow() {
		this.handleToggleDebug();
	}

	@bind
	handleToggleDebug() {
		this.setState({ debugMode: !this.state.debugMode });
	}

}

ImageWindow.propTypes = {
	dicomFile : React.PropTypes.object
};
ImageWindow.defaultProps = {
	dicomFile : null
};
