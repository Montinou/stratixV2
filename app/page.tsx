import { redirect } from 'next/navigation';
import { stackServerApp } from '@/stack/server';

// Force dynamic rendering since we need to access cookies for authentication
export const dynamic = 'force-dynamic';

export default async function Home() {
  try {
    console.log('Home page: Attempting to get user...');
    const user = await stackServerApp.getUser();
    console.log('Home page: User result:', user ? 'User found' : 'No user');

    if (user) {
      console.log('Home page: Redirecting to /tools');
      redirect('/tools');
    }
    console.log('Home page: No user, redirecting to signup');
    redirect('/handler/signup');
  } catch (error) {
    console.error('Home page: Error getting user:', error);
    redirect('/handler/signup');
  }
}
