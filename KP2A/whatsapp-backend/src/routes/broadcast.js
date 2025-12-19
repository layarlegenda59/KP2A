const express = require('express');
const BroadcastController = require('../controllers/BroadcastController');

const createBroadcastRoutes = (broadcastSender) => {
  const router = express.Router();
  const broadcastController = new BroadcastController(broadcastSender);

  // Dashboard route (must come before other routes to avoid conflicts)
  router.get('/dashboard', broadcastController.getDashboard);

  // Broadcast sender control routes (must come before /:id routes to avoid conflicts)
  router.get('/sender/status', broadcastController.getBroadcastSenderStatus);
  router.get('/sender-status', broadcastController.getBroadcastSenderStatus); // Alias for frontend compatibility
  router.post('/sender/test', broadcastController.sendTestMessage);

  // Contact routes (must come before /:id routes to avoid conflicts)
  router.get('/contacts/all', broadcastController.getContacts);
  router.post('/contacts', broadcastController.createContact);
  router.put('/contacts/:id', broadcastController.updateContact);
  router.delete('/contacts/:id', broadcastController.deleteContact);
  router.post('/contacts/import', broadcastController.getUploadMiddleware(), broadcastController.importContacts);
  router.post('/contacts/import-members', broadcastController.importMembersToContacts);
  router.get('/contacts/export', broadcastController.exportContacts);

  // Contact group routes (must come before /:id routes to avoid conflicts)
  router.get('/groups', broadcastController.getContactGroups);
  router.get('/groups/all', broadcastController.getContactGroups);
  router.post('/groups', broadcastController.createContactGroup);
  router.put('/groups/:id', broadcastController.updateContactGroup);
  router.delete('/groups/:id', broadcastController.deleteContactGroup);

  // Broadcast routes (generic /:id routes come last)
  router.post('/', broadcastController.createBroadcast);
  router.get('/', broadcastController.getBroadcasts);
  router.get('/:id', broadcastController.getBroadcast);
  router.patch('/:id/status', broadcastController.updateBroadcastStatus);
  router.post('/:id/send', broadcastController.sendImmediateBroadcast);
  router.get('/:id/recipients', broadcastController.getBroadcastRecipients);
  router.patch('/:broadcastId/recipients/:recipientId', broadcastController.updateRecipientStatus);
  router.get('/:id/analytics', broadcastController.getBroadcastAnalytics);

  return router;
};

module.exports = createBroadcastRoutes;