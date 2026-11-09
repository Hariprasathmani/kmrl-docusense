// components/UI/LoadingState.jsx — Professional loading indicator
import Spinner from './Spinner';
import styles from './LoadingState.module.css';

/**
 * LoadingState — Centered loading indicator with optional message
 * Used across all data-loading scenarios
 * 
 * @param {string} [message] - Optional loading message
 */
export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className={styles.container}>
      <Spinner />
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
