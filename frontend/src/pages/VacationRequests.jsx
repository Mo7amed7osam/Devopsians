import React, { useState, useEffect } from "react";
import axios from "axios";
import "./VacationRequests.module.css";

function VacationRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:3030/api/view-vacation-requests");
        setRequests(response.data.data || []);
      } catch (err) {
        setError("Unable to fetch vacation requests.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  if (loading) return <p>Loading vacation requests...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="vacation-requests">
      <h2>Vacation Requests</h2>
      <ul className="request-list">
        {requests.map((request) => (
          <li key={request._id} className="request-item">
            <p>Employee: {request.employee.firstName} {request.employee.lastName}</p>
            <p>Start Date: {request.startDate}</p>
            <p>End Date: {request.endDate}</p>
            <p>Status: {request.status}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default VacationRequests;
