import express from 'express';
import { ICU_SPECIALIZATIONS } from '../models/roomModel.js';
import { SERVICE_CATEGORIES } from '../models/serviceModel.js';

const router = express.Router();

router.get('/icu-specializations', (_req, res) => {
  res.json({ specializations: ICU_SPECIALIZATIONS });
});

router.get('/service-categories', (_req, res) => {
  res.json({ categories: SERVICE_CATEGORIES });
});

export default router;
