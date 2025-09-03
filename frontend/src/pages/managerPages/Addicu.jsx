import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "./Addicu.module.css";

function AddIcu() {
  const { id } = useParams(); // Get the managerId from the URL params
  const [hospital, setHospital] = useState(null); // Store hospital data
  
  // For ICU details
  const [specialization, setSpecialization] = useState("");
  const [status, setStatus] = useState("");
  const [fees, setFees] = useState("");

  const navigate = useNavigate();

  // Specialization options
  const specializationOptions = [
    "Medical ICU", "Surgical ICU", "Cardiac ICU", "Neonatal ICU",
    "Pediatric ICU", "Neurological ICU", "Trauma ICU", "Burn ICU",
    "Respiratory ICU", "Coronary Care Unit", "Oncology ICU", 
    "Transplant ICU", "Geriatric ICU", "Post-Anesthesia Care Unit",
    "Obstetric ICU", "Infectious Disease ICU"
  ];

  useEffect(() => {
    const fetchHospitalDetails = async () => {
      try {
        const response = await fetch(`http://localhost:3030/admin/view-an-managers/${id}`);
        const data = await response.json();

        if (response.ok) {
          // Assuming the hospitalId is inside the 'hospitalId' field in the data
          const hospitalId = data.data.hospitalId[0]; // Take the first hospitalId in the array
          setHospital(hospitalId);
        } else {
          toast.error(data.message || "Failed to fetch hospital details");
        }
      } catch (error) {
        toast.error("Error fetching hospital details");
        console.error(error);
      }
    };

    if (id) {
      fetchHospitalDetails();
    }
  }, [id]);

  const submitForm = async (e) => {
    e.preventDefault();

    const icuData = {
      hospitalId: hospital, 
      specialization,
      status,
      fees,
    };

    try {
      const icuResponse = await fetch("http://localhost:3030/manager/register-icu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(icuData),
      });

      const icuDataResponse = await icuResponse.json();
      if (icuResponse.ok) {
        toast.success("ICU added successfully!");

      } else {
        toast.error(icuDataResponse.message || "Failed to add ICU");
      }
    } catch (error) {
      toast.error("An error occurred while adding the ICU.");
      console.error(error);
    }
  };

  if (!hospital) {
    return <div>Loading...</div>;
  }

  return (
    <section className="bg-indigo-50">
      <div className={styles.container}>
        <div className="bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0">
          <form onSubmit={submitForm}>
            <h2 className="text-3xl text-center font-semibold mb-6">
              Add ICU to Hospital
            </h2>
            {/* Specialization */}
            <div className="mb-4">
              <label htmlFor="specialization" className="block text-gray-700 font-bold mb-2">
                Specialization
              </label>
              <select
                id="specialization"
                name="specialization"
                className="border rounded w-full py-2 px-3 mb-2"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                required
              >
                <option value="">Select Specialization</option>
                {specializationOptions.map((option, index) => (
                  <option key={index} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="mb-4">
              <label htmlFor="status" className="block text-gray-700 font-bold mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                className="border rounded w-full py-2 px-3 mb-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
              >
                <option value="">Select Status</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
              </select>
            </div>

            {/* Fees */}
            <div className="mb-4">
              <label htmlFor="fees" className="block text-gray-700 font-bold mb-2">
                Fees
              </label>
              <input
                type="number"
                id="fees"
                name="fees"
                className="border rounded w-full py-2 px-3 mb-2"
                placeholder="Fees for ICU"
                required
                value={fees}
                onChange={(e) => setFees(e.target.value)}
              />
            </div>

            <div>
              <button
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline"
                type="submit"
              >
                Add ICU
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default AddIcu;
