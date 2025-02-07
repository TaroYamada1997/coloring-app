// pages/index.tsx
import React from 'react';
import Link from 'next/link';
import Head from 'next/head';

const coloringImages = {
  '1': {
    path: './ten.jpg',
    title: '塗り絵 1'
  },
  '2': {
    path: './ten.jpg',
    title: '塗り絵 2'
  },
  '3': {
    path: './ten.jpg',
    title: '塗り絵 3'
  }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 py-4">
      <Head>
        <title>ぬりえアプリ</title>
        <meta name="description" content="ぬりえアプリのトップページ" />
      </Head>

      <div className="max-w-xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">ぬりえアプリ</h1>
        
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(coloringImages).map(([id, image]) => (
            <Link 
              href={`/coloring/${id}`}
              key={id}
              className="block bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <img 
                src={image.path} 
                alt={image.title}
                className="w-full h-40 object-cover"
              />
              <div className="p-4">
                <h2 className="text-lg font-semibold">{image.title}</h2>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}