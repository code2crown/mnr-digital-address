import React from "react";

export default function ThankYou() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md text-center">

        <div className="flex justify-center mb-4">
          <svg
            className="w-20 h-20 text-green-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m6 2.25a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800">
          Verification Submitted Successfully!
        </h1>

        <p className="text-gray-600 mt-3 text-sm leading-relaxed">
          Thank you for completing the address verification process.  
          Your submission has been successfully received and will be reviewed by our verification team shortly.
        </p>

        <div className="mt-6 mb-4">
          <div className="border-t border-gray-200 my-4"></div>

          <p className="text-xs text-gray-500">
            You may now close this page.  
            If required, our team will reach out to you for any additional information.
          </p>
        </div>
      </div>
    </div>
  );
}
