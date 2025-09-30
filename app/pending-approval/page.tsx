import { stackServerApp } from '@/stack/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Mail, LogOut } from 'lucide-react';

export default async function PendingApprovalPage() {
  const user = await stackServerApp.getUser();

  const handleSignOut = async () => {
    'use server';
    await stackServerApp.signOut();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-3">
              <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Approval Pending</CardTitle>
          <CardDescription className="text-center">
            Your account is awaiting approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/10 p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Account Under Review
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your account <strong>{user?.primaryEmail}</strong> is currently under review.
                  You will receive access once an administrator approves your request.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium text-gray-900 dark:text-gray-100">What happens next?</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>An administrator will review your request</li>
              <li>You'll receive an email notification once approved</li>
              <li>You can then sign in and access all tools</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <form action={handleSignOut}>
              <Button
                type="submit"
                variant="outline"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-500">
            Need help? Contact your administrator
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
