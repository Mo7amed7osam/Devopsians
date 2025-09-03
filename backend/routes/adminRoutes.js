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
  assignManager,
  viewAllAdmins,
  viewAllManagers,
  searchManagerWithHospitals,
  searchHospitalWithFeedbacks,
  viewHospitalsRating,
  viewAnManager,
} from "../controllers/adminController.js";

router.post("/add-hospital", addHospital);
router.put("/block-hospital/:id", blockHospital);
router.get("/view-hospitals", viewHospitals);
router.delete("/delete-hospital/:id", deleteHospital);
router.post("/assign-manager", assignManager);
router.put("/unblock-hospital/:id", unblockHospital);
router.post("/create-manager-account", createManagerAccount);
router.post("/create-admin-account", createAdminAccount);
router.get("/view-all-admins", viewAllAdmins);
router.get("/view-all-managers", viewAllManagers);
router.get("/search-manager-with-hospitals", searchManagerWithHospitals);
router.get("/search-hospital-with-feedbacks/:hospitalId",searchHospitalWithFeedbacks);
router.get("/view-an-managers/:id", viewAnManager);
router.get("/view-hospitals-rating", viewHospitalsRating);

export default router;
