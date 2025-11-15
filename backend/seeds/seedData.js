export const seedData = {
  users: [
    { 
      userName: "admin1",
      firstName: "Admin", 
      lastName: "User",
      email: "admin@demo.com", 
      userPass: "123456", 
      role: "Admin",
      phone: "+201234567891",
      gender: "Male"
    },
    { 
      userName: "manager1",
      firstName: "Manager", 
      lastName: "User",
      email: "manager@demo.com", 
      userPass: "123456", 
      role: "Manager",
      phone: "+201234567892",
      gender: "Male"
    },
    { 
      userName: "patient1",
      firstName: "Patient", 
      lastName: "User",
      email: "patient@demo.com", 
      userPass: "123456", 
      role: "Patient",
      phone: "+201234567893",
      gender: "Male",
      currentCondition: "Stable",
      medicalHistory: "No significant medical history"
    },
    { 
      userName: "receptionist1",
      firstName: "Receptionist", 
      lastName: "User",
      email: "receptionist@demo.com", 
      userPass: "123456", 
      role: "Receptionist",
      phone: "+201234567894",
      gender: "Female"
    },
    { 
      userName: "ambulance1",
      firstName: "Hassan", 
      lastName: "Ali",
      email: "ambulance1@demo.com", 
      userPass: "123456", 
      role: "Ambulance",
      phone: "+201234567895",
      gender: "Male",
      status: "AVAILABLE"
    },
    { 
      userName: "ambulance2",
      firstName: "Fatima", 
      lastName: "Ahmed",
      email: "ambulance2@demo.com", 
      userPass: "123456", 
      role: "Ambulance",
      phone: "+201234567896",
      gender: "Female",
      status: "AVAILABLE"
    },
    { 
      userName: "ambulance3",
      firstName: "Mina", 
      lastName: "Gerges",
      email: "ambulance3@demo.com", 
      userPass: "123456", 
      role: "Ambulance",
      phone: "+201234567897",
      gender: "Male",
      status: "EN_ROUTE"
    },
    { 
      userName: "patient2",
      firstName: "John", 
      lastName: "Doe",
      email: "johndoe@demo.com", 
      userPass: "123456", 
      role: "Patient",
      phone: "+201234567898",
      gender: "Male",
      currentCondition: "Critical - Cardiac emergency",
      medicalHistory: "Hypertension, previous MI"
    },
    { 
      userName: "patient3",
      firstName: "Jane", 
      lastName: "Smith",
      email: "janesmith@demo.com", 
      userPass: "123456", 
      role: "Patient",
      phone: "+201234567899",
      gender: "Female",
      currentCondition: "Pediatric fever",
      medicalHistory: "No previous conditions"
    }
  ],

  hospitals: [
    {
      name: "City General Hospital",
      location: {
        type: "Point",
        coordinates: [31.2357, 30.0444] // [longitude, latitude] - Cairo
      },
      address: "123 Main Street, Cairo",
      contactNumber: "+20212345678",
      email: "info@citygeneral.com",
      status: "Active"
    },
    {
      name: "North Star Medical Center",
      location: {
        type: "Point",
        coordinates: [31.2497, 30.0626] // Alexandria
      },
      address: "456 North Avenue, Alexandria",
      contactNumber: "+20212345679",
      email: "contact@northstar.com",
      status: "Active"
    }
  ],

  icus: [
    {
      specialization: "Cardiac ICU",
      room: "101",
      status: "Available",
      fees: 600,
      isReserved: false
    },
    {
      specialization: "Neurological ICU",
      room: "102",
      status: "Occupied",
      fees: 800,
      isReserved: true
    },
    {
      specialization: "Medical ICU",
      room: "103",
      status: "Maintenance",
      fees: 500,
      isReserved: false
    },
    {
      specialization: "Pediatric ICU",
      room: "104",
      status: "Available",
      fees: 750,
      isReserved: false
    }
  ],

  tasks: [
    {
      name: "Check ICU Equipment - Room 101",
      deadLine: new Date("2025-10-28"),
      priority: "High",
      status: "Pending",
      description: "Verify all cardiology equipment is functional"
    },
    {
      name: "Patient Transportation - ICU 102",
      deadLine: new Date("2025-10-27"),
      priority: "Urgent",
      status: "In Progress",
      description: "Transport patient from ER to ICU"
    },
    {
      name: "Ambulance Maintenance Check",
      deadLine: new Date("2025-10-30"),
      priority: "Medium",
      status: "Pending",
      description: "Routine maintenance for ambulance fleet"
    }
  ],

  feedbacks: [
    {
      rating: 5,
      comment: "Excellent service! The ICU staff was very professional and caring."
    },
    {
      rating: 4,
      comment: "Good facilities but waiting time was a bit long."
    },
    {
      rating: 5,
      comment: "Dr. Ahmed provided exceptional care during my treatment."
    }
  ],

  services: [
    {
      name: "Emergency Care",
      description: "24/7 emergency medical services",
      fee: 500,
      category: "General"
    },
    {
      name: "ICU Care",
      description: "Intensive care unit monitoring and treatment",
      fee: 1200,
      category: "ICU"
    },
    {
      name: "Visitor Room",
      description: "Private visitor room for family members",
      fee: 300,
      category: "Visitor Room"
    },
    {
      name: "Kids Area Service",
      description: "Pediatric care and monitoring",
      fee: 400,
      category: "Kids Area"
    }
  ]
};
