import { UserPen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfileActions({ setShowDeleteModal }) {
  const router = useRouter();

  return (
    <div className="bg-white border border-gray-300 rounded-2xl shadow p-6">
      <h3 className="text-xl font-bold text-[#1F2421] mb-6">Account Actions</h3>
      <div className="space-y-4">
        <button
          onClick={() => router.push("/dashboard/settings/edit-profile")}
          className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors duration-150 text-left border border-gray-200"
        >
          <div className="w-12 h-12 bg-[#105588] rounded-full flex items-center justify-center">
            <UserPen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-[#1F2421]">Edit Profile</h4>
            <p className="text-sm text-gray-500">Update your personal information</p>
          </div>
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-red-50 rounded-2xl transition-colors duration-150 text-left border border-gray-200 hover:border-red-200"
        >
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-red-600">Delete Account</h4>
            <p className="text-sm text-gray-500">Permanently delete your account</p>
          </div>
        </button>
      </div>
    </div>
  );
}
