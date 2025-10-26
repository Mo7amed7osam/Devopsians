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

// Bind the modal to your app element for accessibility
ReactModal.setAppElement('#root'); // Or your app's root ID

const Modal = ({ isOpen, onClose, children }) => {
  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel="Example Modal"
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