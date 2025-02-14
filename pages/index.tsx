// pages/index.tsx
import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { coloringMap } from '@/public/const/imagePath';
import Image from 'next/image';

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
          {Object.entries(coloringMap).map(([id, image]) => (
            <Link
              href={`/coloring/${id}`}
              key={id}
              className="block bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <Image
                src={image.path}
                alt={image.title}
                height={100}
                width={100}
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
