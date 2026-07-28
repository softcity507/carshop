'use client';

 
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-2">Something went wrong!</h2>
      <p className="text-gray-600 mb-4">{error.message || 'An unexpected error occurred.'}</p>
      <button onClick={() => reset()} className="px-4 py-2 bg-blue-600 text-white rounded">
        Try again
      </button>
    </div>
  );
}
