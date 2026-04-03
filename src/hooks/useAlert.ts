import { useCallback } from 'react';
import Swal from 'sweetalert2';

// Custom theme for SweetAlert2 to match Cyber-Midnight
const swalConfig = {
  background: '#ffffff',
  color: '#000000',
  confirmButtonColor: '#a855f7', // purple-500
  cancelButtonColor: '#f43f5e',  // rose-500
  customClass: {
    popup: 'rounded-3xl border border-white/10 backdrop-blur-xl',
    title: 'text-2xl font-bold',
    htmlContainer: 'text-gray-400 font-medium',
    confirmButton: 'rounded-2xl px-8 py-3 font-bold',
    cancelButton: 'rounded-2xl px-8 py-3 font-bold'
  }
};

export function useAlert() {
  const showAlert = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Clean message of Firebase references and tech jargon
    let cleanMessage = message;
    
    // Try to parse JSON errors (from handleFirestoreError)
    try {
      if (message.startsWith('{') && message.endsWith('}')) {
        const parsed = JSON.parse(message);
        if (parsed.error) cleanMessage = parsed.error;
      }
    } catch (e) {
      // Not JSON, continue with raw message
    }

    cleanMessage = cleanMessage.replace(/Firebase:?\s*/gi, '');
    
    // Replace obscure Firebase error codes with user-friendly messages
    if (cleanMessage.includes('auth/invalid-credential') || cleanMessage.toLowerCase().includes('invalid credential')) {
      cleanMessage = 'Invalid email or password. Please try again.';
    } else if (cleanMessage.includes('auth/user-not-found')) {
      cleanMessage = 'No account found with this email.';
    } else if (cleanMessage.includes('auth/wrong-password')) {
      cleanMessage = 'Incorrect password. Please try again.';
    } else if (cleanMessage.includes('auth/email-already-in-use')) {
      cleanMessage = 'This email is already registered.';
    } else if (cleanMessage.includes('auth/popup-closed-by-user')) {
      cleanMessage = 'Sign-in window was closed.';
    } else if (cleanMessage.includes('permission-denied') || cleanMessage.includes('Missing or insufficient permissions')) {
      cleanMessage = 'You do not have permission to perform this action.';
    }
    
    // Strip any remaining (auth/...) codes or [firestore/...] codes
    cleanMessage = cleanMessage.replace(/\(auth\/[^)]+\)\.?/g, '');
    cleanMessage = cleanMessage.replace(/\[firestore\/[^\]]+\]\.?/g, '');
    cleanMessage = cleanMessage.trim();
    
    // Capitalize first letter if it's not
    if (cleanMessage.length > 0) {
      cleanMessage = cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);
    }
    
    Swal.fire({
      ...swalConfig,
      text: cleanMessage,
      icon: type,
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  }, []);

  const hideAlert = useCallback(() => {
    Swal.close();
  }, []);

  const showConfirm = useCallback(async (title: string, message: string, confirmText: string = 'Confirm') => {
    const result = await Swal.fire({
      ...swalConfig,
      title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancel',
    });
    return result.isConfirmed;
  }, []);

  return { alert: null as any, showAlert, hideAlert, showConfirm };
}
