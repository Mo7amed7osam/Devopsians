import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ICUMgmt.module.css";

function ICUMgmt() {
  const [icus, setICUs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchICUs = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:3030/api/view-icus");
        setICUs(response.data.data || []);
      } catch (err) {
        setError("Unable to fetch ICUs.");
      } finally {
        setLoading(false);
      }
    };

    fetchICUs();
  }, []);

  if (loading) return <p>Loading ICUs...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="icu-mgmt">
      <h2>ICU Management</h2>
      <ul className="icu-list">
        {icus.map((icu) => (
          <li key={icu._id} className="icu-item">
            <h3>{icu.specialization}</h3>
            <p>Status: {icu.status}</p>
            <p>Hospital: {icu.hospital.name}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ICUMgmt;
