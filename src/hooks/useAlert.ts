import { useCallback } from 'react';
import Swal from 'sweetalert2';

// Custom theme for SweetAlert2 to match Cyber-Midnight
const swalConfig = {
  background: '#1a1b3b',
  color: '#ffffff',
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
    Swal.fire({
      ...swalConfig,
      text: message,
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
