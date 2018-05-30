import React from 'react';
import { bind } from 'decko';
import styles from './style.less';
import { prepareImageData } from '../../lib/dicom/processor';
import ImageNavigationControl from '../ImageNavigationControl';
import ImageCanvas from '../ImageCanvas';
import DicomWindowLevelData from '../DicomWindowLevelData';
import DicomDebugWindow from '../DicomDebugWindow';

/** A UI component that displays images from a DICOM file.
 */
export default class ImageWindow extends React.Component {

	constructor(props) {
		super(props);
		let { session } = props;
		this.state = {
			debugMode: false,
			imageIndex: 0,
			windowWidth: session.windowWidth,
			windowCenter: session.windowCenter
		};
	}

	componentWillUpdate(nextProps, nextState) {
		let { session } = this.props;
		if (session !== null) {
			session.windowWidth = nextState.windowWidth;
			session.windowCenter = nextState.windowCenter;
		}
	}

	render() {
		let { session } = this.props;
		let { debugMode, imageIndex, windowCenter, windowWidth } = this.state;

		let dicomFile = session.dicomFile;
		if (dicomFile === null) {
			return (
				<div className={styles.window} id="image-window"></div>
			);
		}

		// TODO: Seems like this could be refactored out into somewhere cleaner
		let pixelArray = dicomFile.pixelArrays[imageIndex],
			width = dicomFile.getImageWidth(),
			height = dicomFile.getImageHeight(),
			slope = dicomFile.getImageSlope(),
			intercept = dicomFile.getImageIntercept(),
			imageData = prepareImageData(pixelArray, width, height, slope, intercept, windowCenter, windowWidth);

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
		let { dicomFile } = this.props.session;
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
		// TODO: Redux refactor
		if (newWindowWidth > 1) {
			this.setState({windowWidth: newWindowWidth});
		}
	}

	@bind
	handleWindowCenterChanged(newWindowCenter) {
		// TODO: Redux refactor
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
	session: React.PropTypes.object
};
ImageWindow.defaultProps = {
	session: null
};
