import { redirect } from 'next/navigation';
import { stackServerApp } from '../../../stackk

export default async function Home() {
  const user = await stackServerApp.getUser();

  if (user) {
    redirect('/tools');
  }
  redirect('/handler/signup');
}
