import { redirect } from 'next/navigation';
import { stackServerApp } from '@/stack/server';

export default async function Home() {
  try {
    const user = await stackServerApp.getUser();

    if (user) {
      redirect('/tools');
    }
    redirect('/handler/signup');
  } catch (error) {
    console.error('Error getting user:', error);
    redirect('/handler/signup');
  }
}
