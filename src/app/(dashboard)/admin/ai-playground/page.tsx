import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PlaygroundClient from './PlaygroundClient';

export const metadata = {
  title: 'AI Playground | GIDA-REHBERİ',
  description: 'Novexis-AI Core Çevrimdışı Yapay Zeka Test ve Simülasyon Paneli',
};

export default async function AIPlaygroundPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Rol Yetkilendirme Kontrolü (Sadece Kalite Müdürü ve Firma Sahibi erişebilir)
  const role = (session.user as any).role;
  if (role !== 'KALITE_MUDURU' && role !== 'FIRMA_SAHIBI') {
    redirect('/');
  }

  return (
    <PlaygroundClient />
  );
}
