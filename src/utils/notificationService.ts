import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile } from '../types';

export interface Notification {
  _id: string;
  id?: string;
  toUserId: string;
  type: 'like' | 'match' | 'message';
  isRead: boolean;
  sender: {
    uid: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    media?: { type: 'image' | 'video'; url: string }[];
  };
  createdAt: any;
}

export const sendNotification = async (toUserId: string, type: Notification['type'], sender: UserProfile) => {
  if (!auth.currentUser) return;
  
  try {
    const notificationData = {
      toUserId,
      type,
      isRead: false,
      sender: {
        uid: sender.uid || sender.id,
        firstName: sender.firstName,
        lastName: sender.lastName,
        media: sender.media || []
      },
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, 'notifications'), notificationData);
  } catch (err) {
    console.error('Error sending notification:', err);
  }
};

export const getNotifications = (callback: (notifications: Notification[]) => void) => {
  if (!auth.currentUser) return () => {};

  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', auth.currentUser.uid),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      _id: doc.id,
      id: doc.id,
      ...doc.data()
    } as Notification));
    callback(notifications);
  }, (err) => {
    console.error('Notification snapshot error:', err);
  });
};

export const markNotificationsRead = async () => {
  if (!auth.currentUser) return;

  try {
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', auth.currentUser.uid),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      batch.update(d.ref, { isRead: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error marking notifications read:', err);
  }
};

export const deleteNotification = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (err) {
    console.error('Error deleting notification:', err);
  }
};

export const clearAllNotifications = async () => {
  if (!auth.currentUser) return;

  try {
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', auth.currentUser.uid)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error clearing all notifications:', err);
  }
};
