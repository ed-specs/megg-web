import Image from "next/image";
import { Building2, MapPin, CheckCircle, UserPen } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfileCard({ userData }) {
  const router = useRouter();
  
  if (!userData) return null;

  // Combine primary farm and additional farms into one list
  const allFarms = [];
  
  // Add primary farm if it exists
  if (userData?.farmName) {
    allFarms.push({
      id: "primary",
      name: userData.farmName,
      address: userData.farmAddress || "",
      isPrimary: true
    });
  }
  
  // Add additional farms if they exist
  if (userData?.additionalFarms && Array.isArray(userData.additionalFarms)) {
    allFarms.push(...userData.additionalFarms.map(farm => ({
      ...farm,
      isPrimary: false
    })));
  }

  return (
    <div className="bg-white border border-gray-300 rounded-2xl shadow p-6">
      {/* Profile Header Section */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 mb-6 border-b border-gray-200">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-gray-200 shadow flex-shrink-0">
          {userData?.profileImageUrl ? (
            <Image
              src={userData.profileImageUrl}
              alt="Profile"
              fill
              className="object-cover"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              onError={(e) => {
                // Hide image and show letter avatar on error
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          {/* Letter Avatar - shown when no profile image */}
          <div 
            className={`absolute inset-0 rounded-full bg-[#105588] flex items-center justify-center ${userData?.profileImageUrl ? 'hidden' : 'flex'}`}
            style={{ display: userData?.profileImageUrl ? 'none' : 'flex' }}
          >
            <span className="text-white text-3xl sm:text-4xl font-bold">
              {(userData?.fullName || userData?.fullname || userData?.username || "U").charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className="flex-1 text-center sm:text-left min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1F2421] mb-2 break-words">
            {userData?.fullName || "User"}
          </h2>
          <p className="text-gray-500 text-lg mb-3">@{userData?.username || "username"}</p>
          <span className="inline-block px-4 py-2 bg-[#E4BE76] border border-[#E4BE76] rounded-lg text-base text-[#1F2421] font-mono font-semibold">
            {userData?.accountId || "Not provided"}
          </span>
        </div>

        {/* Edit Profile Button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => router.push("/dashboard/settings/edit-profile")}
            className="flex items-center gap-2 px-4 py-3 bg-[#105588] hover:bg-[#0d4470] text-white rounded-xl transition-colors duration-200 font-medium shadow-sm hover:shadow-md"
          >
            <UserPen className="w-5 h-5" />
            <span className="hidden sm:inline">Edit Profile</span>
            <span className="sm:hidden">Edit</span>
          </button>
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                Full Name
              </label>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-gray-800 font-medium">
                  {userData?.fullName || "Not provided"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                Username
              </label>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-gray-800 font-medium">
                  {userData?.username || "Not provided"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                Email
              </label>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-gray-800 font-medium">
                  {userData?.email || "Not provided"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                Phone
              </label>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-gray-800 font-medium">
                  {userData?.phone || "Not provided"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                Birthday
              </label>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-gray-800 font-medium">
                  {userData?.birthday ? new Date(userData.birthday).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : "No information provided"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                Age
              </label>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-gray-800 font-medium">
                  {userData?.age ? `${userData.age} years old` : "No information provided"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                Gender
              </label>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-gray-800 font-medium capitalize">
                  {userData?.gender ? (userData.gender === 'prefer-not-to-say' ? 'Prefer not to say' : userData.gender) : "No information provided"}
                </span>
              </div>
            </div>

            <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-[#1F2421] mb-3">
            Address
          </label>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <span className="text-gray-800 font-medium">
              {userData?.address || "No address information provided"}
            </span>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-[#1F2421] mb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Farm Locations
            {allFarms.length > 0 && (
              <span className="text-xs text-gray-500 font-normal">
                ({allFarms.length} {allFarms.length === 1 ? 'farm' : 'farms'})
              </span>
            )}
          </label>
          
          {allFarms.length === 0 ? (
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No farm information provided</p>
              <p className="text-xs text-gray-400 mt-1">Add your farm details in Edit Profile</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allFarms.map((farm, index) => (
                <div
                  key={farm.id || index}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    farm.isPrimary
                      ? "bg-gradient-to-r from-green-50 to-blue-50 border-green-300 shadow-sm"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      farm.isPrimary ? "bg-green-500" : "bg-blue-500"
                    }`}>
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-gray-800 text-lg">
                          {farm.name}
                        </h4>
                        {farm.isPrimary && (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white text-xs font-semibold rounded-full shadow-sm">
                            <CheckCircle className="w-3 h-3" />
                            PRIMARY
                          </span>
                        )}
                      </div>
                      {farm.address ? (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p className="break-words">{farm.address}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No address provided</p>
                      )}
                      {farm.isPrimary && (
                        <p className="text-xs text-green-700 mt-2">
                          This farm is used in exports and reports
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {allFarms.length > 0 && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>Tip:</strong> Manage your farm locations in Edit Profile settings. The primary farm is used for all exports and official documents.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
