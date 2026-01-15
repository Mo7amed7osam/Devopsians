// src/components/Modal.jsx
import React from "react";
import ReactModal from "react-modal";
import styles from "./Modal.module.css";

// Note: ReactModal.setAppElement is called once at app startup (in main.jsx)

const Modal = ({ isOpen, onClose, children, contentLabel = "Modal" }) => {
  if (!isOpen) return null;

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel={contentLabel}
      ariaHideApp={true}
      className={styles.content}
      overlayClassName={styles.overlay}
    >
      <button
        onClick={onClose}
        className={styles.close}
        aria-label="Close modal"
        type="button"
      >
        &times;
      </button>
      {children}
    </ReactModal>
  );
};

export default Modal;
