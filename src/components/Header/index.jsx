import React from 'react';
import styles from './style.less';

/**
 * A component that presents a header bar.
 */
export default class Header extends React.Component {

	render() {
		let { title } = this.props;

		return (
			<div className={styles.header}>
				<span className={styles.title}>
					{title}
				</span>
				<span className={styles.buttonContainer}>
					<span className={styles.button}>
						Account
					</span>
					<span className={styles.button}>
						Help
					</span>
				</span>
			</div>
		);
	}
}

Header.propTypes = {
	title : React.PropTypes.string
};
Header.defaultProps = {
	title : "(undefined)"
};
