import React, { useState } from "react";

function AddEmployee() {
  const [formData, setFormData] = useState({
    managerId: "",
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    phone: "",
    userPass: "",
    role: "",
    gender: "",
  });

  const [response, setResponse] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3030/manager/add-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      setResponse({ success: false, message: error.message });
    }
  };

  return (
    <div>
      <h2>Add Employee</h2>
      <form onSubmit={handleSubmit}>
        {Object.keys(formData).map((key) => (
          <div key={key}>
            <label>{key}: </label>
            <input
              type="text"
              name={key}
              value={formData[key]}
              onChange={handleChange}
              required
            />
          </div>
        ))}
        <button type="submit">Add Employee</button>
      </form>
      {response && <p>{response.message}</p>}
    </div>
  );
}

export default AddEmployee;
