import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const upgradeUserToPro = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { isPro: true });
    return true;
  } catch (error) {
    console.error('Error upgrading user to Pro:', error);
    throw error;
  }
};

export const downgradeUserToFree = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { isPro: false });
    return true;
  } catch (error) {
    console.error('Error downgrading user:', error);
    throw error;
  }
};
