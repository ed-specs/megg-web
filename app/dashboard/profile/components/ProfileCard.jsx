import Image from "next/image";

export default function ProfileCard({ userData }) {
  if (!userData) return null;

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
          <label className="block text-sm font-semibold text-[#1F2421] mb-3">
            Farm Name
          </label>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <span className="text-gray-800 font-medium">
              {userData?.farmName || "No farm name provided"}
            </span>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-[#1F2421] mb-3">
            Farm Address
          </label>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <span className="text-gray-800 font-medium">
              {userData?.farmAddress || "No farm address provided"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
