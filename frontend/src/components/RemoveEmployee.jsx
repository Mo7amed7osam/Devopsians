import { useState } from "react";

function RemoveEmployee() {
  const [id, setId] = useState(""); // Change 'userName' to 'id'
  const [response, setResponse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Use 'id' in the fetch URL instead of 'userName'
      const res = await fetch(
        `http://localhost:3030/manager/remove-employee/${id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      setResponse({ success: false, message: error.message });
    }
  };

  return (
    <div>
      <h2>Remove Employee</h2>
      <form onSubmit={handleSubmit}>
        <label>ID: </label> {/* Change label to ID */}
        <input
          type="text"
          value={id} // Update to use 'id'
          onChange={(e) => setId(e.target.value)} // Update to set 'id'
          required
        />
        <button type="submit">Remove</button>
      </form>
      {response && <p>{response.message}</p>}
    </div>
  );
}

export default RemoveEmployee;
