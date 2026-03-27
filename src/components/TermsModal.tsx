import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Terms & Conditions</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto text-gray-600 space-y-4">
              <p>Welcome to RelaxConnect. By using our app, you agree to the following terms:</p>
              <h3 className="font-semibold text-gray-900">1. Eligibility</h3>
              <p>You must be at least 18 years old to use this service.</p>
              <h3 className="font-semibold text-gray-900">2. Content</h3>
              <p>You are responsible for the content you post. We do not tolerate harassment or illegal activities.</p>
              <h3 className="font-semibold text-gray-900">3. Privacy</h3>
              <p>Your data is handled according to our Privacy Policy.</p>
              <p>By clicking "Accept", you agree to all terms mentioned above.</p>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={onAccept}
                className="flex-1 px-4 py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200"
              >
                Accept
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
