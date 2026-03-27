import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  Timestamp,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Status, UserProfile } from '../types';
import { fetchMatches } from './likesService';

const STATUS_COLLECTION = 'statuses';

export async function createStatus(userId: string, imageUrl: string, text?: string): Promise<void> {
  const path = STATUS_COLLECTION;
  try {
    const createdAt = serverTimestamp();
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

    await addDoc(collection(db, path), {
      userId,
      imageUrl,
      text: text || '',
      createdAt,
      expiresAt
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeToMyStatuses(userId: string, callback: (statuses: Status[]) => void) {
  const q = query(
    collection(db, STATUS_COLLECTION),
    where('userId', '==', userId),
    where('expiresAt', '>', Timestamp.now()),
    orderBy('expiresAt', 'desc'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const statuses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Status));
    callback(statuses);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, STATUS_COLLECTION);
  });
}

export async function fetchMatchesWithStatuses(): Promise<Status[]> {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  try {
    const matches = await fetchMatches();
    const matchIds = matches.map(m => m.uid);

    if (matchIds.length === 0) return [];

    // Firestore 'in' query supports up to 10 items. 
    // For simplicity, we'll fetch all active statuses and filter in memory if matchIds > 10,
    // or just fetch for the first 10 matches for now.
    const activeStatusesQuery = query(
      collection(db, STATUS_COLLECTION),
      where('userId', 'in', matchIds.slice(0, 10)),
      where('expiresAt', '>', Timestamp.now()),
      orderBy('expiresAt', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(activeStatusesQuery);
    const statuses = await Promise.all(snapshot.docs.map(async (d) => {
      const data = d.data();
      const user = matches.find(m => m.uid === data.userId);
      return {
        id: d.id,
        ...data,
        user
      } as Status;
    }));

    return statuses;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, STATUS_COLLECTION);
    return [];
  }
}

export async function recordStatusView(statusId: string): Promise<void> {
  const viewerId = auth.currentUser?.uid;
  if (!viewerId) return;
  try {
    await updateDoc(doc(db, STATUS_COLLECTION, statusId), {
      viewedBy: arrayUnion(viewerId)
    });
  } catch (err) {
    // silently fail — viewing is non-critical
    console.warn('Could not record status view:', err);
  }
}
