// src/pages/PageNotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './PageNotFound.module.css';

const PageNotFound = () => {
    return (
        <div className={styles.container}>
            <h1 className={styles.errorCode}>404</h1>
            <h2 className={styles.title}>Page Not Found</h2>
            <p className={styles.message}>
                Oops! The page you are looking for doesn't exist.
            </p>
            <Link to="/" className={styles.homeButton}>
                Go to Homepage
            </Link>
        </div>
    );
};
export default PageNotFound;