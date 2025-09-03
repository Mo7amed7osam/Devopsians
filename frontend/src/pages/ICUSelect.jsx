import React from "react";
// import "./ICUSelect.css";
import PrivateRoute from "./PrivateRoute";

const ICUSelect = () => {
  <PrivateRoute requiredRole="Patient">
    <div className="icu-page">I'm ICU</div>
  </PrivateRoute>;
};

export default ICUSelect;
