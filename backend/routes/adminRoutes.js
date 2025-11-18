import express from "express";
const router = express.Router();

import {
  addHospital,
  viewHospitals,
  deleteHospital,
  blockHospital,
  unblockHospital,
  createManagerAccount,
  createAdminAccount,
  createUser,
  assignManager,
  viewAllAdmins,
  viewAllManagers,
  searchManagerWithHospitals,
  searchHospitalWithFeedbacks,
  viewHospitalsRating,
  viewAnManager,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
} from "../controllers/adminController.js";

router.post("/add-hospital", addHospital);
router.put("/block-hospital/:id", blockHospital);
router.get("/view-hospitals", viewHospitals);
router.delete("/delete-hospital/:id", deleteHospital);
router.post("/assign-manager", assignManager);
router.put("/unblock-hospital/:id", unblockHospital);
router.post("/create-manager-account", createManagerAccount);
router.post("/create-admin-account", createAdminAccount);
router.post("/create-user", createUser);
router.get("/view-all-admins", viewAllAdmins);
router.get("/view-all-managers", viewAllManagers);
router.put('/update-user/:id', updateUser);
router.delete('/delete-user/:id', deleteUser);
router.put('/block-user/:id', blockUser);
router.put('/unblock-user/:id', unblockUser);
router.get("/search-manager-with-hospitals", searchManagerWithHospitals);
router.get("/search-hospital-with-feedbacks/:hospitalId",searchHospitalWithFeedbacks);
router.get("/view-an-managers/:id", viewAnManager);
router.get("/view-hospitals-rating", viewHospitalsRating);

export default router;
