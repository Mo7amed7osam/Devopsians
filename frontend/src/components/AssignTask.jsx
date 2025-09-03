import { useState } from "react";

function AssignTask({ employeeId, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    employeeId: employeeId,
    deadLine: "",
    priority: "",
    status: "",
  });

  const [response, setResponse] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        "http://localhost:3030/manager/create-and-assign-task",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const data = await res.json();
      setResponse(data); // Set the response data after submitting the form
    } catch (error) {
      setResponse({ success: false, message: error.message }); // Handle errors
    }
  };

  return (
    <div>
      <h2>Assign Task</h2>
      <form onSubmit={handleSubmit}>
        {Object.keys(formData).map((key) => (
          <div key={key}>
            <label>{key}: </label>
            <input
              type={key === "deadLine" ? "date" : "text"}
              name={key}
              value={formData[key]}
              onChange={handleChange}
              required
            />
          </div>
        ))}
        <button type="submit">Assign</button>
      </form>
      {response && <p>{response.message}</p>} {/* Display response message */}
      <button onClick={onClose}>Close</button>
    </div>
  );
}

export default AssignTask;
