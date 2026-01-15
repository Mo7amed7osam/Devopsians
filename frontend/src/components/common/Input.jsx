import React from "react";
import styles from "./Input.module.css";
import SecureInput from "./SecureInput";
import SecureSelect from "./SecureSelect";
import SecureTextarea from "./SecureTextarea";

const Input = ({
  label,
  helper,
  error,
  as = "input",
  className = "",
  fieldClassName = "",
  ...props
}) => {
  const Field =
    as === "select" ? SecureSelect : as === "textarea" ? SecureTextarea : SecureInput;

  return (
    <label className={`${styles.field} ${className}`}>
      {label && <span className={styles.label}>{label}</span>}
      <Field
        className={`${styles.input} ${error ? styles.inputError : ""} ${fieldClassName}`}
        {...props}
      />
      {helper && !error && <span className={styles.helper}>{helper}</span>}
      {error && <span className={styles.error}>{error}</span>}
    </label>
  );
};

export default Input;
