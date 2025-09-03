import { useState } from "react";

function TrackEmployeeTasks({ employeeId, onClose }) {
  const [useCaseName, setUseCaseName] = useState("");
  const [tasks, setTasks] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `http://localhost:3030/manager/track-employee-tasks?employeeId=${employeeId}&useCaseName=${useCaseName}`
      );
      const data = await res.json();
      setTasks(data.data || []); // Set tasks based on response
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  return (
    <div>
      <h2>Track Employee Tasks</h2>
      <form onSubmit={handleSubmit}>
        <label>Use Case Name: </label>
        <input
          type="text"
          value={useCaseName}
          onChange={(e) => setUseCaseName(e.target.value)}
          required
        />
        <button type="submit">Track</button>
      </form>
      <div>
        <h3>Tasks:</h3>
        {tasks.length === 0 ? (
          <p>No tasks found</p>
        ) : (
          tasks.map((task) => (
            <div key={task._id}>
              <p>
                {task.name} (Assigned to: {task.assignedTo.firstName})
              </p>
            </div>
          ))
        )}
      </div>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

export default TrackEmployeeTasks;
