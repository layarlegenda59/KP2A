import React from 'react';

export default function WhatsAppMobileTestSimple() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">WhatsApp Mobile Integration</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Hubungkan aplikasi dengan WhatsApp mobile Anda untuk monitoring dan kontrol remote
        </p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Component Loading Test</h2>
          <p className="text-gray-600 dark:text-gray-300">
            This is a simplified version of the WhatsApp Mobile Test component to verify routing works.
          </p>
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-green-800 dark:text-green-300 font-medium">✅ Component loaded successfully!</p>
            <p className="text-green-600 dark:text-green-400 text-sm">The routing system is working correctly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}