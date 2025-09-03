import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "./AddHospital.module.css";

function AddHospital() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const navigate = useNavigate();

  const submitForm = async (e) => {
    e.preventDefault();

    const hospitalData = {
      name,
      address,
      email,
      longitude,
      latitude,
      contactNumber,
    };

    try {
      // Make a POST request to add the hospital
      const response = await fetch("http://localhost:3030/admin/add-hospital", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(hospitalData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Hospital added successfully!");
        navigate("/ViewHospital");
      } else {
        toast.error(data.message || "Failed to add hospital");
      }
    } catch (error) {
      toast.error("An error occurred while adding the hospital.");
      console.error(error);
    }
  };

  return (
    <section className="bg-indigo-50">
      <div className={styles.container} >
        <div className="bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0">
          <form onSubmit={submitForm}>
            <h2 className="text-3xl text-center font-semibold mb-6">
              Add Hospital
            </h2>

            {/* Hospital Name */}
            <div className="mb-4">
              <label
                htmlFor="name"
                className="block text-gray-700 font-bold mb-2"
              >
                Hospital Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="border rounded w-full py-2 px-3 mb-2"
                placeholder="Hospital Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Hospital Address */}
            <div className="mb-4">
              <label
                htmlFor="address"
                className="block text-gray-700 font-bold mb-2"
              >
                Hospital Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                className="border rounded w-full py-2 px-3 mb-2"
                placeholder="Address of the hospital"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-gray-700 font-bold mb-2"
              >
                Contact Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="border rounded w-full py-2 px-3 mb-2"
                placeholder="Email address for contact"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Longitude */}
            <div className="mb-4">
              <label
                htmlFor="longitude"
                className="block text-gray-700 font-bold mb-2"
              >
                Longitude
              </label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                className="border rounded w-full py-2 px-3 mb-2"
                placeholder="Longitude of the hospital"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>

            {/* Latitude */}
            <div className="mb-4">
              <label
                htmlFor="latitude"
                className="block text-gray-700 font-bold mb-2"
              >
                Latitude
              </label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                className="border rounded w-full py-2 px-3 mb-2"
                placeholder="Latitude of the hospital"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>

            {/* Contact Number */}
            <div className="mb-4">
              <label
                htmlFor="contactNumber"
                className="block text-gray-700 font-bold mb-2"
              >
                Contact Phone
              </label>
              <input
                type="tel"
                id="contactNumber"
                name="contactNumber"
                className="border rounded w-full py-2 px-3"
                placeholder="Phone number for contact"
                required
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
              />
            </div>

            <div>
              <button
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline"
                type="submit"
              >
                Add Hospital
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default AddHospital;
