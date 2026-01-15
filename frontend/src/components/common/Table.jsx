import React from "react";
import styles from "./Table.module.css";

const Table = ({ className = "", tableClassName = "", children, ...rest }) => {
  return (
    <div className={`${styles.wrap} ${className}`} {...rest}>
      <table className={`${styles.table} ${tableClassName}`}>{children}</table>
    </div>
  );
};

export default Table;
