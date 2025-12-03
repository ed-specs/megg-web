"use client"

/**
 * PasswordStrengthIndicator - Reusable password strength indicator component
 * Shows visual feedback and requirements for password strength
 * 
 * @param {Object} props
 * @param {Object} props.strength - Password strength object { score, level, color, width, checks }
 * @param {string} props.password - Current password value (to show/hide indicator)
 */
export default function PasswordStrengthIndicator({ strength, password }) {
  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Password strength</span>
        <span className={`text-xs font-medium ${
          strength.level === 'weak' ? 'text-red-500' :
          strength.level === 'medium' ? 'text-yellow-500' : 'text-green-500'
        }`}>
          {strength.level.charAt(0).toUpperCase() + strength.level.slice(1)}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all duration-300 ${strength.color}`}
          style={{ width: strength.width }}
        ></div>
      </div>
      
      {/* Password Requirements */}
      <div className="flex flex-wrap gap-1 mt-2">
        {strength.checks && Object.entries(strength.checks).map(([key, passed]) => (
          <span 
            key={key} 
            className={`text-xs px-2 py-1 rounded ${
              passed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {key === 'length' ? '8+ chars' :
             key === 'lowercase' ? 'a-z' :
             key === 'uppercase' ? 'A-Z' :
             key === 'numbers' ? '0-9' : 'symbols'}
          </span>
        ))}
      </div>
    </div>
  )
}

