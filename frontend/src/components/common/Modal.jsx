// src/components/Modal.jsx
import React from 'react';
import ReactModal from 'react-modal';

// Style object for the modal
const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    border: '1px solid #ccc',
    borderRadius: '10px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 1000
  },
};

// Note: ReactModal.setAppElement is called once at app startup (in main.jsx)

const Modal = ({ isOpen, onClose, children, contentLabel = 'Modal' }) => {
  // Avoid mounting the modal component unless it is open. This prevents
  // React-Modal from attempting to register multiple modal instances when
  // modals are rapidly opened/closed or when multiple wrappers exist.
  if (!isOpen) return null;

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel={contentLabel}
      // Keep ariaHideApp enabled for accessibility. We guard setAppElement above
      ariaHideApp={true}
    >
      <button 
        onClick={onClose} 
        style={{ 
          position: 'absolute', 
          top: '15px', 
          right: '15px', 
          background: 'none', 
          border: 'none', 
          fontSize: '1.5rem', 
          cursor: 'pointer',
          color: '#888'
        }}
      >
        &times;
      </button>
      {children}
    </ReactModal>
  );
};

export default Modal;