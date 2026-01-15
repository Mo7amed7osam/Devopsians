import React from "react";
import styles from "./Badge.module.css";

const Badge = ({ variant = "neutral", className = "", children, ...rest }) => {
  const variantClass = styles[variant] || styles.neutral;
  return (
    <span className={`${styles.badge} ${variantClass} ${className}`} {...rest}>
      {children}
    </span>
  );
};

export default Badge;
