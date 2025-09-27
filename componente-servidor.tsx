'use server';

import { neon } from '@neondatabase/serverless';
import { stackServerApp } from "@/stack";

export async function TodoList() {
  const user = await stackServerApp.getUser();
  const sql = neon(process.env.DATABASE_AUTHENTICATED_URL!, {
    authToken: async () => {
      const authToken = (await user?.getAuthJson())?.accessToken; 
      if (!authToken) {
        throw new Error('No token');
      }
      return authToken;
    },
  });

  // WHERE filter is optional because of RLS.
  // But we send it anyway for performance reasons.
  const todos = await
    sql('select * from todos where user_id = auth.user_id()'); 

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.task}</li>
      ))}
    </ul>
  );
}