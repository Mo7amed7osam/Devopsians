import express from 'express';
import { addHospital , blockHospital, viewHospitals, assignManager} from '../controllers/adminController.js';

const router = express.Router();

router.post('/add-hospital', addHospital);
router.put('/block-hospital/:id', blockHospital);
router.get('/view-hospitals', viewHospitals);
router.put('/assign-manager/:id', assignManager);

export default router;
