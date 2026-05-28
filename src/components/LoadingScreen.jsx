import React from 'react';

export default function LoadingScreen({ message = 'Loading...', error = null, onRetry = null, onBack = null }) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-bg-900">
      <div className="text-center max-w-md px-6">
        {!error ? (
          <>
            <div className="spinner w-10 h-10 mx-auto mb-5 text-gray-300" />
            <div className="text-gray-300 text-sm">{message}</div>
            <div className="text-gray-600 text-xs mt-2">This usually takes 5-15 seconds.</div>
          </>
        ) : (
          <>
            <div className="text-red-400 text-2xl mb-3">✗</div>
            <div className="text-gray-200 text-sm font-medium mb-2">Generation failed</div>
            <div className="text-gray-500 text-xs mb-6 font-mono break-words">{error}</div>
            <div className="flex gap-3 justify-center">
              {onBack && (
                <button onClick={onBack} className="px-4 py-2 bg-bg-700 hover:bg-bg-600 rounded-md text-sm">
                  Back
                </button>
              )}
              {onRetry && (
                <button onClick={onRetry} className="px-4 py-2 bg-accent-blue hover:bg-blue-600 rounded-md text-sm">
                  Retry
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
