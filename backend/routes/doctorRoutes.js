import express from "express";

// Doctor routes have been removed from the project. This stub returns 410
// Gone for any /doctor/* requests so clients receive a clear response.
const router = express.Router();

router.use((req, res) => {
    res.status(410).json({ success: false, message: 'Doctor API has been removed from the server.' });
});

export default router;
