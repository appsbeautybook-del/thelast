import express from 'express';
import { createReservation } from '../controllers/reservation.controller.js';
import { completeReservation, updateReservation, getReservations } from '../controllers/reservationExtra.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { sendReservationEmail } from '../services/emailService.js';

const router = express.Router();

// All reservation routes require authentication
router.use(requireAuth);

router.post('/', createReservation);
router.post('/complete', completeReservation);
router.post('/list', getReservations);
router.put('/:id', updateReservation);

// Send reservation email (confirmed or cancelled)
router.post('/send-email', async (req, res) => {
  try {
    const { to, type, clientName, serviceName, date, time, proName, reason } = req.body;
    if (!to || !type) return res.status(400).json({ error: 'to and type are required' });
    const result = await sendReservationEmail({ to, type, clientName, serviceName, date, time, proName, reason });
    res.json(result);
  } catch (err) {
    console.error('[Reservation] Send email error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

export default router;
