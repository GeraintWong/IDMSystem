import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UserCircle, LogOut } from "lucide-react";

interface User {
  name: string;
  email: string;
  accountStatus: string;
}

const Dashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <Card className="w-full max-w-2xl shadow-lg rounded-2xl p-6 bg-white">
        <div className="flex items-center gap-4">
          <UserCircle size={48} className="text-blue-500" />
          <div>
            <h2 className="text-2xl font-semibold">You have successfully logged in using Hyperledger Aries. Welcome!</h2>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
