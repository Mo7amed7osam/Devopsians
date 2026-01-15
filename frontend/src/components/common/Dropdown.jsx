import React from "react";
import styles from "./Dropdown.module.css";

const Dropdown = ({ isOpen, onToggle, children, label = "Actions" }) => {
  return (
    <div className={styles.dropdown} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className={styles.trigger}
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerLabel}>{label}</span>
        <span className={styles.caret} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className={styles.menu} role="menu">
          {children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
