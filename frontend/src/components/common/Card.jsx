import React from "react";
import styles from "./Card.module.css";

const Card = ({ as: Component = "div", className = "", children, ...rest }) => {
  return (
    <Component className={`${styles.card} ${className}`} {...rest}>
      {children}
    </Component>
  );
};

export default Card;
