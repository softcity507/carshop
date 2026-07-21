import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto p-6 w-full">
        <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
        <p className="text-gray-600 mb-6">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Have questions? Send us a message below.
        </p>
        <form className="space-y-4 max-w-lg border p-6 rounded bg-white">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input type="text" className="w-full border p-2 rounded mt-1" placeholder="Your Name" />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input type="email" className="w-full border p-2 rounded mt-1" placeholder="your@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium">Message</label>
            <textarea className="w-full border p-2 rounded mt-1" rows={4} placeholder="Write your message..."></textarea>
          </div>
          <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded">Send Message</button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
