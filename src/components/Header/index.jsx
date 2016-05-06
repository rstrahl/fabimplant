import React from 'react';
import styles from './style.less';
import IconButton from '../IconButton';

/**
 * A component that presents a header bar.
 */
export default class Header extends React.Component {

	render() {
		return (
			<div className={styles.header}>
				<div className={styles.title}>
					FAB<span className={styles.pipe}>|</span>IMPLANT
				</div>
				<div className={styles.buttonContainer}>
					<IconButton icon="smile" />
				</div>
			</div>
		);
	}
}

Header.propTypes = {
};
Header.defaultProps = {
};
