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
      userName: "patient1",
      firstName: "John", 
      lastName: "Doe",
      email: "patient@demo.com", 
      userPass: "123456", 
      role: "Patient",
      phone: "+201234567892",
      gender: "Male",
      currentCondition: "Stable",
      medicalHistory: "No major medical history"
    },
    { 
      userName: "manager1",
      firstName: "Sarah", 
      lastName: "Manager",
      email: "manager@demo.com", 
      userPass: "123456", 
      role: "Manager",
      phone: "+201234567893",
      gender: "Female"
    },
    { 
      userName: "receptionist1",
      firstName: "Emily", 
      lastName: "Receptionist",
      email: "receptionist@demo.com", 
      userPass: "123456", 
      role: "Receptionist",
      phone: "+201234567894",
      gender: "Female"
    },
    { 
      userName: "ambulance1",
      firstName: "Mike", 
      lastName: "Driver",
      email: "ambulance@demo.com", 
      userPass: "123456", 
      role: "Ambulance",
      phone: "+201234567895",
      gender: "Male",
      status: "AVAILABLE"
    }
  ]
};
