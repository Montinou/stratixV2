import { redirect } from 'next/navigation';
import { stackServerApp } from '@/stack/server';
import { LandingPage } from '@/components/landing-page';

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

    // Show landing page for non-authenticated users
    console.log('Home page: No user, showing landing page');
    return <LandingPage />;
  } catch (error) {
    console.error('Home page: Error getting user:', error);
    // Show landing page on error as well
    return <LandingPage />;
  }
}
