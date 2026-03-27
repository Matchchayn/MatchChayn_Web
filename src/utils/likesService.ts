import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  setDoc,
  doc, 
  serverTimestamp, 
  getDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import { sendNotification } from './notificationService';

export interface MatchRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
  fromUser?: UserProfile;
  toUser?: UserProfile;
}

export async function sendMatchRequest(toUserId: string) {
  const fromUserId = auth.currentUser?.uid;
  if (!fromUserId) throw new Error('Not authenticated');

  const path = 'likes';
  try {
    // Fetch sender profile for notification
    const fromUserSnap = await getDoc(doc(db, 'users', fromUserId));
    if (!fromUserSnap.exists()) return;
    const fromUser = { uid: fromUserId, ...fromUserSnap.data() } as UserProfile;

    // Check if already sent
    const q = query(
      collection(db, path),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return;

    // Check if there's a reciprocal like
    const reciprocalQ = query(
      collection(db, path),
      where('fromUserId', '==', toUserId),
      where('toUserId', '==', fromUserId)
    );
    const reciprocalSnapshot = await getDocs(reciprocalQ);

    if (!reciprocalSnapshot.empty) {
      // It's a match!
      const reciprocalDoc = reciprocalSnapshot.docs[0];
      await updateDoc(doc(db, path, reciprocalDoc.id), {
        status: 'accepted'
      });

      await addDoc(collection(db, path), {
        fromUserId,
        toUserId,
        status: 'accepted',
        createdAt: serverTimestamp()
      });

      // Create a match document for easier querying
      const matchId = [fromUserId, toUserId].sort().join('_');
      await setDoc(doc(db, 'matches', matchId), {
        users: [fromUserId, toUserId],
        createdAt: serverTimestamp()
      });

      // Send Match Notification to the other user
      await sendNotification(toUserId, 'match', fromUser);
    } else {
      // Just a like
      await addDoc(collection(db, path), {
        fromUserId,
        toUserId,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Send Like Notification to the other user
      await sendNotification(toUserId, 'like', fromUser);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchReceivedRequests(): Promise<MatchRequest[]> {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const path = 'likes';
  try {
    const q = query(
      collection(db, path),
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    
    const requests = await Promise.all(snapshot.docs.map(async (d) => {
      const data = d.data();
      const userDoc = await getDoc(doc(db, 'users', data.fromUserId));
      return {
        id: d.id,
        ...data,
        fromUser: userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as UserProfile : undefined
      } as MatchRequest;
    }));

    return requests;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

export async function fetchMatches(): Promise<UserProfile[]> {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const path = 'matches';
  try {
    const q = query(
      collection(db, path),
      where('users', 'array-contains', userId)
    );
    const snapshot = await getDocs(q);
    
    const matchUserIds = snapshot.docs.map(d => {
      const users = d.data().users as string[];
      return users.find(id => id !== userId);
    }).filter(Boolean) as string[];

    const matchProfiles = await Promise.all(matchUserIds.map(async (id) => {
      const userDoc = await getDoc(doc(db, 'users', id));
      return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as UserProfile : null;
    }));

    return matchProfiles.filter(Boolean) as UserProfile[];
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

export async function respondToRequest(requestId: string, status: 'accepted' | 'rejected') {
  const requestRef = doc(db, 'likes', requestId);
  const requestSnap = await getDoc(requestRef);
  
  if (!requestSnap.exists()) return;
  const requestData = requestSnap.data();

  await updateDoc(requestRef, { status });

  if (status === 'accepted') {
    // Create reciprocal accepted like if it doesn't exist
    const reciprocalQ = query(
      collection(db, 'likes'),
      where('fromUserId', '==', requestData.toUserId),
      where('toUserId', '==', requestData.fromUserId)
    );
    const reciprocalSnapshot = await getDocs(reciprocalQ);
    
    if (reciprocalSnapshot.empty) {
      await addDoc(collection(db, 'likes'), {
        fromUserId: requestData.toUserId,
        toUserId: requestData.fromUserId,
        status: 'accepted',
        createdAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'likes', reciprocalSnapshot.docs[0].id), {
        status: 'accepted'
      });
    }

    // Create match
    const matchId = [requestData.fromUserId, requestData.toUserId].sort().join('_');
    await setDoc(doc(db, 'matches', matchId), {
      users: [requestData.fromUserId, requestData.toUserId],
      createdAt: serverTimestamp()
    });
  }
}

export async function skipUser(toUserId: string) {
  const fromUserId = auth.currentUser?.uid;
  if (!fromUserId) throw new Error('Not authenticated');

  const path = 'skips';
  try {
    // Check if already skipped
    const q = query(
      collection(db, path),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return;

    await addDoc(collection(db, path), {
      fromUserId,
      toUserId,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchSentRequests(): Promise<MatchRequest[]> {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const path = 'likes';
  try {
    const q = query(
      collection(db, path),
      where('fromUserId', '==', userId),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    
    const requests = await Promise.all(snapshot.docs.map(async (d) => {
      const data = d.data();
      const userDoc = await getDoc(doc(db, 'users', data.toUserId));
      return {
        id: d.id,
        ...data,
        toUser: userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as UserProfile : undefined
      } as MatchRequest;
    }));

    return requests;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

export async function cancelMatchRequest(requestId: string) {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');

  const path = 'likes';
  try {
    const requestRef = doc(db, path, requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) return;

    const data = requestSnap.data();
    if (data.fromUserId !== userId) throw new Error('Unauthorized');

    await updateDoc(requestRef, { status: 'rejected' }); // Or delete: await deleteDoc(requestRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
