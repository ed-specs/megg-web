import { AlertTriangle } from "lucide-react";
import DashboardModal from "../../components/DashboardModal";

export default function DeleteAccountModal({ 
  showDeleteModal, 
  setShowDeleteModal, 
  handleDeleteAccount, 
  deleteLoading, 
  deleteError, 
  password, 
  setPassword 
}) {
  return (
    <DashboardModal
      isOpen={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      title="Delete Account"
      size="lg"
    >

      <div className="mb-6">
        <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl mb-6 border border-red-200">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-red-800">Warning</h4>
            <p className="text-sm text-red-700 leading-relaxed">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#1F2421] mb-3">
            Enter your password to confirm
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
            placeholder="Enter your password"
            disabled={deleteLoading}
          />
        </div>

        {deleteError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-700 font-medium">{deleteError}</p>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setShowDeleteModal(false)}
          className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 transition-colors duration-200 font-semibold"
          disabled={deleteLoading}
        >
          Cancel
        </button>
        <button
          onClick={handleDeleteAccount}
          className="flex-1 px-6 py-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
          disabled={deleteLoading || !password.trim()}
        >
          {deleteLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Deleting...
            </>
          ) : (
            "Delete Account"
          )}
        </button>
      </div>
    </DashboardModal>
  );
}
