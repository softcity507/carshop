import { Footer } from '@/components/layout/Footer';

export default function UserPage() {
  return (
    <div className="flex flex-1 flex-col">
       <main className="flex-1 max-w-5xl mx-auto p-6 w-full">
        <h1 className="text-3xl font-bold mb-4">User Portal</h1>
        <p className="text-gray-600 mb-6">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Welcome to your personal customer portal.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="border p-6 rounded bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-2">My Profile</h2>
            <p className="text-gray-500 text-sm mb-4">Lorem ipsum dolor sit amet, update your details.</p>
            <div className="text-sm space-y-1 text-gray-700">
              <p><strong>Name:</strong> John Doe</p>
              <p><strong>Email:</strong> user@example.com</p>
            </div>
          </div>
          <div className="border p-6 rounded bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-2">My Orders</h2>
            <p className="text-gray-500 text-sm mb-4">Lorem ipsum dolor sit amet, track your active vehicle requests.</p>
            <p className="text-sm text-gray-500">No active orders found.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
