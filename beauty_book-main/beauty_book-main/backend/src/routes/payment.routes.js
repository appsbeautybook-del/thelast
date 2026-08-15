import express from 'express';
import {
  createCheckoutSession,
  stripeWebhook,
  createSubscriptionCheckout,
  createWalletRecharge,
  createSetupIntent,
  getPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  chargeSavedCard,
} from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Stripe webhook — MUST be before express.json() middleware
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Authenticated routes
router.post('/checkout-session', requireAuth, createCheckoutSession);
router.post('/subscription-checkout', requireAuth, createSubscriptionCheckout);
router.post('/wallet-recharge', requireAuth, createWalletRecharge);

// Payment Methods (saved cards)
router.post('/setup-intent', requireAuth, createSetupIntent);
router.get('/payment-methods', requireAuth, getPaymentMethods);
router.delete('/payment-methods/:id', requireAuth, deletePaymentMethod);
router.post('/payment-methods/:id/default', requireAuth, setDefaultPaymentMethod);
router.post('/charge-saved', requireAuth, chargeSavedCard);

export default router;
