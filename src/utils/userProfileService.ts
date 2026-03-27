import { collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const clearProfileCache = () => {
  localStorage.removeItem('user_profile');
};

export const getCachedProfile = (): any => {
  const cached = localStorage.getItem('user_profile');
  return cached ? JSON.parse(cached) : null;
};

export const fetchUserProfile = async (forceRefresh = false): Promise<any> => {
  if (!auth.currentUser) return null;
  
  if (!forceRefresh) {
    const cached = getCachedProfile();
    if (cached) return cached;
  }

  const profile = await getUserProfile(auth.currentUser.uid);
  if (profile) {
    localStorage.setItem('user_profile', JSON.stringify(profile));
  }
  return profile;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.GET, path);
    }
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const createUserProfile = async (profile: Partial<UserProfile>) => {
  if (!profile.uid) throw new Error('UID is required');
  const path = `users/${profile.uid}`;
  try {
    const docRef = doc(db, 'users', profile.uid);
    await setDoc(docRef, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (uid: string, profile: Partial<UserProfile>) => {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...profile,
      updatedAt: serverTimestamp(),
    });
    // Update cache
    const current = getCachedProfile();
    if (current && current.uid === uid) {
      localStorage.setItem('user_profile', JSON.stringify({ ...current, ...profile }));
    }
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const fetchMatchingProfiles = async (interestedIn?: string): Promise<UserProfile[]> => {
  const path = 'users';
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return [];

    // Fetch likes sent by current user
    const likesQ = query(
      collection(db, 'likes'),
      where('fromUserId', '==', currentUserId)
    );
    const likesSnapshot = await getDocs(likesQ);

    const excludedByLikes = likesSnapshot.docs
      .filter(doc => doc.data().status !== 'rejected')
      .map(doc => doc.data().toUserId);

    // Fetch skips sent by current user
    const skipsQ = query(
      collection(db, 'skips'),
      where('fromUserId', '==', currentUserId)
    );
    const skipsSnapshot = await getDocs(skipsQ);
    const excludedBySkips = skipsSnapshot.docs.map(doc => doc.data().toUserId);

    const excludedIds = new Set([...excludedByLikes, ...excludedBySkips]);

    // Fetch all profiles
    const q = query(collection(db, 'users'));
    const querySnapshot = await getDocs(q);
    const profiles: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data() as UserProfile;
      const uid = userData.uid || doc.id;
      
      // Basic exclusions
      if (uid === currentUserId) return;
      if (excludedIds.has(uid)) return;

      // Gender filtering
      if (interestedIn === 'men' && userData.gender !== 'male') return;
      if (interestedIn === 'women' && userData.gender !== 'female') return;
      // 'everyone' or undefined doesn't skip anything here
      
      profiles.push(userData);
    });
    return profiles;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.warn('Firestore Permission Denied in fetchMatchingProfiles:', error.message || error);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export const likeUser = async (targetUserId: string) => {
  console.log('Liked user:', targetUserId);
  // Implement like logic in Firestore if needed
  return { success: true };
};
