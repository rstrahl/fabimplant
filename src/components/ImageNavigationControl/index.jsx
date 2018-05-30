import React from 'react';
import { bind } from 'decko';
import styles from './style.less';
import ImageNavigationButton from '../ImageNavigationButton';

/**
 * A Navigation Bar for navigating through the collection of DICOM images in
 * a given DicomFile.
 */
export default class ImageNavigationControl extends React.Component {

	 constructor(props) {
		 super(props);
	 }

	 shouldComponentUpdate(nextProps) {
		 return nextProps.currentImageIndex !== this.props.currentImageIndex;
	 }

	 render() {
		 return (
			 <div className={styles.container}>
				 <div className={styles.title}>
					 Image Index
				 </div>
				 <div className={styles.text}>
					 {this.props.currentImageIndex + 1} / {this.props.imageIndexMax}
				 </div>
				 <div>
					 <ImageNavigationButton label="&lt;" handleButtonClick={this.handleButtonClick} indexModifier={-1} />
					 <div className={styles.input}>
						 <input type="range" defaultValue="0" min="0" max={this.props.imageIndexMax} onChange={this.handleChangeImageIndex}></input>
					 </div>
					 <ImageNavigationButton label="&gt;" handleButtonClick={this.handleButtonClick} indexModifier={1} />
				 </div>
			 </div>
		 );
	 }

	 @bind
	 handleButtonClick(indexModifier) {
		 this.props.handleImageIndexChanged(this.props.currentImageIndex + indexModifier);
	 }

	 @bind
	 handleChangeImageIndex(event) {
		 this.props.handleImageIndexChanged(event.target.valueAsNumber);
	 }

}

ImageNavigationControl.propTypes = {
	currentImageIndex : React.PropTypes.number,
	imageIndexMax : React.PropTypes.number,
	handleImageIndexChanged : React.PropTypes.func
};
ImageNavigationControl.defaultProps = {
	currentImageIndex : 0,
	imageIndexMax : 0,
	handleImageIndexChanged : null
};
