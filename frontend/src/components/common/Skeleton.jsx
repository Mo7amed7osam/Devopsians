import React from "react";
import styles from "./Skeleton.module.css";

const Skeleton = ({ variant = "line", count = 1, className = "" }) => {
  const items = Array.from({ length: count });
  return (
    <div className={`${styles.wrap} ${className}`}>
      {items.map((_, index) => (
        <div key={index} className={`${styles.skeleton} ${styles[variant]}`} />
      ))}
    </div>
  );
};

export default Skeleton;
