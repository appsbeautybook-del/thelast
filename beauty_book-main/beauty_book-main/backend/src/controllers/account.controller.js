import { supabaseAdmin } from '../config/supabase.js';
import { addFidelitePoints, creditFideliteAuto } from './fidelite.controller.js';

export { addFidelitePoints, creditFideliteAuto };

export const deleteAccount = async (req, res) => {
  try {
    const email = req.user.email;
    const userId = req.user.id;

    console.log(`Suppression du compte pour: ${email} (${userId})`);

    // Helper functions to simplify deletion calls
    const deleteByFilter = async (table, filterCol, filterVal) => {
      const { data: items } = await supabaseAdmin.from(table).select('id').eq(filterCol, filterVal).limit(500);
      if (items && items.length > 0) {
        await Promise.all(items.map(i => supabaseAdmin.from(table).delete().eq('id', i.id)));
      }
    };

    // Run deletions in parallel where possible
    const deletions = await Promise.allSettled([
      deleteByFilter('Reservation', 'client_email', email),
      deleteByFilter('Reservation', 'pro_email', email),
      deleteByFilter('ProfilPro', 'user_email', email),
      deleteByFilter('Service', 'pro_email', email),
      deleteByFilter('Style', 'pro_email', email),
      deleteByFilter('Reel', 'author_email', email),
      deleteByFilter('Avis', 'auteur_email', email),
      deleteByFilter('MessageChat', 'sender_email', email),
      deleteByFilter('Notification', 'user_email', email),
      deleteByFilter('Panier', 'user_email', email),
      deleteByFilter('Commande', 'client_email', email),
      deleteByFilter('DemandeProV2', 'user_email', email),
      deleteByFilter('MariaConversation', 'user_email', email),
      deleteByFilter('CommentaireStyle', 'user_email', email),
      deleteByFilter('Repub', 'user_email', email),
      deleteByFilter('PointsFidelite', 'user_email', email),
      deleteByFilter('LiveSession', 'host_email', email),
      deleteByFilter('LiveMessage', 'sender_email', email),
      deleteByFilter('Avis', 'cible_email', email)
    ]);

    // Log non-blocking deletion errors
    deletions.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`Erreur suppression groupe ${i}:`, result.reason);
      }
    });

    // Delete user from auth schema
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error('Failed to delete user from auth schema:', deleteUserError);
      throw deleteUserError;
    }

    // Since deleting auth.users doesn't necessarily delete the profiles record if there's no cascade trigger:
    // Try manually deleting profile to be safe
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    console.log(`Compte supprimé avec succès: ${email}`);

    return res.json({ success: true });
  } catch (error) {
    console.error('deleteAccount error:', error);
    return res.status(500).json({ error: error.message });
  }
};
