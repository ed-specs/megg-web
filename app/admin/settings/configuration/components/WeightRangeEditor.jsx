"use client"

import { useState, useEffect } from "react"
import { X, AlertCircle, CheckCircle, Sparkles } from "lucide-react"
import { validateRanges } from "../../../../utils/configurationService"
import { devError } from "../../../../utils/auth-helpers"

export default function WeightRangeEditor({ rangeType, currentRange, allRanges, onSave, onCancel }) {
  const [minValue, setMinValue] = useState(currentRange.min.toString())
  const [maxValue, setMaxValue] = useState(currentRange.max.toString())
  const [validation, setValidation] = useState(null)
  const [saving, setSaving] = useState(false)
  const [smartAdjustment, setSmartAdjustment] = useState(null)

  // Validate on change
  useEffect(() => {
    const validate = () => {
      const min = parseFloat(minValue)
      const max = parseFloat(maxValue)

      // Basic validation
      if (isNaN(min) || isNaN(max)) {
        setValidation({
          isValid: false,
          errors: [{ message: "Please enter valid numbers" }],
          warnings: []
        })
        return
      }

      if (min < 0 || max < 0) {
        setValidation({
          isValid: false,
          errors: [{ message: "Values must be positive" }],
          warnings: []
        })
        return
      }

      if (min >= max) {
        setValidation({
          isValid: false,
          errors: [{ message: "Minimum must be less than maximum" }],
          warnings: []
        })
        return
      }

      // Create temporary ranges with updated values
      const tempRanges = {
        ...allRanges,
        [rangeType]: { min, max, label: currentRange.label }
      }

      // Validate all ranges together
      const result = validateRanges(tempRanges)
      
      // Filter validation to only show errors/warnings for this range or related ranges
      // Overlaps and gaps are now warnings - only basic validation errors block saving
      const relevantErrors = result.errors.filter(err => 
        err.range === rangeType
      )
      
      // Show warnings for gaps and overlaps involving this range
      const relevantWarnings = result.warnings.filter(warn => 
        warn.between?.includes(rangeType) ||
        (warn.type === 'overlap' && (warn.range1 === rangeType || warn.range2 === rangeType))
      )

      // Check if there are gaps or overlaps (for display purposes only - they don't block saving)
      const hasGaps = result.gaps.length > 0
      const hasOverlaps = result.overlaps.length > 0
      
      // Calculate smart adjustment suggestions for gaps and overlaps
      // Handle cascading adjustments when a range overlaps multiple ranges
      let smartAdjust = null
      
      // Create sorted array of all ranges
      const rangesArray = [
        { name: 'small', ...tempRanges.small },
        { name: 'medium', ...tempRanges.medium },
        { name: 'large', ...tempRanges.large }
      ].sort((a, b) => a.min - b.min)
      
      // Find current range index in sorted array
      const currentIndex = rangesArray.findIndex(r => r.name === rangeType)
      const currentRangeData = rangesArray[currentIndex]
      
      if (currentIndex >= 0) {
        // Priority 1: Check overlap after current range (between current and next)
        if (currentIndex < rangesArray.length - 1) {
          const nextRange = rangesArray[currentIndex + 1]
          
          // If there's an overlap after current range (current.max >= next.min)
          if (currentRangeData.max >= nextRange.min) {
            // Calculate suggested min for next range
            const suggestedMin = parseFloat((currentRangeData.max + 0.01).toFixed(2))
            
            // Calculate suggested max - maintain the original range size if possible
            let suggestedMax = parseFloat(nextRange.max.toFixed(2))
            const originalRangeSize = nextRange.max - nextRange.min
            
            // If the suggested min would be greater than or equal to the current max, adjust the max
            if (suggestedMin >= suggestedMax) {
              // Calculate preferred max maintaining original range size
              const preferredMax = parseFloat((suggestedMin + Math.max(originalRangeSize, 1.0)).toFixed(2))
              
              // Check if there's a range after nextRange
              if (currentIndex + 1 < rangesArray.length - 1) {
                const rangeAfterNext = rangesArray[currentIndex + 2]
                
                // If preferred max would overlap with the range after
                if (preferredMax >= rangeAfterNext.min) {
                  // Try to set max just before the next range
                  const maxBeforeNext = parseFloat((rangeAfterNext.min - 0.01).toFixed(2))
                  
                  // Ensure we still have a valid range (min < max)
                  if (maxBeforeNext > suggestedMin) {
                    // We can fit the range before the next one
                    suggestedMax = maxBeforeNext
                  } else {
                    // Not enough space - set max to min + minimum range size
                    // This will create an overlap with the next range, which is allowed (warning)
                    suggestedMax = parseFloat((suggestedMin + 1.0).toFixed(2))
                  }
                } else {
                  // No overlap with next range, use preferred max
                  suggestedMax = preferredMax
                }
              } else {
                // No range after, use preferred max
                suggestedMax = preferredMax
              }
            }
            
            smartAdjust = {
              targetRange: nextRange.name,
              targetRangeLabel: nextRange.label || nextRange.name.charAt(0).toUpperCase() + nextRange.name.slice(1),
              adjustment: {
                min: suggestedMin,
                max: suggestedMax
              },
              issue: {
                type: 'overlap',
                from: currentRangeData.max,
                to: nextRange.min,
                between: `${rangeType} and ${nextRange.name}`
              },
              cascadingAdjustments: []
            }
            
            // Check if the adjusted range now overlaps with the range after it (cascading overlap)
            if (currentIndex + 1 < rangesArray.length - 1) {
              const rangeAfterNext = rangesArray[currentIndex + 2]
              if (suggestedMax >= rangeAfterNext.min) {
                // Calculate adjustment for the range after next
                const nextSuggestedMin = parseFloat((suggestedMax + 0.01).toFixed(2))
                const nextOriginalRangeSize = rangeAfterNext.max - rangeAfterNext.min
                let nextSuggestedMax = parseFloat(rangeAfterNext.max.toFixed(2))
                
                // Maintain original range size if possible
                if (nextSuggestedMin >= nextSuggestedMax) {
                  nextSuggestedMax = parseFloat((nextSuggestedMin + Math.max(nextOriginalRangeSize, 1.0)).toFixed(2))
                }
                
                smartAdjust.cascadingAdjustments.push({
                  targetRange: rangeAfterNext.name,
                  targetRangeLabel: rangeAfterNext.label || rangeAfterNext.name.charAt(0).toUpperCase() + rangeAfterNext.name.slice(1),
                  adjustment: {
                    min: nextSuggestedMin,
                    max: nextSuggestedMax
                  }
                })
              }
            }
          }
          // If there's a gap after current range (current.max < next.min)
          else if (currentRangeData.max + 0.01 < nextRange.min && !smartAdjust) {
            const suggestedMin = parseFloat((currentRangeData.max + 0.01).toFixed(2))
            smartAdjust = {
              targetRange: nextRange.name,
              targetRangeLabel: nextRange.label || nextRange.name.charAt(0).toUpperCase() + nextRange.name.slice(1),
              adjustment: {
                min: suggestedMin,
                max: parseFloat(nextRange.max.toFixed(2)) // Keep the max the same, ensure 2 decimal places
              },
              issue: {
                type: 'gap',
                from: currentRangeData.max,
                to: nextRange.min,
                between: `${rangeType} and ${nextRange.name}`
              }
            }
          }
        }
        
        // Priority 2: Check overlap before current range (between previous and current)
        if (currentIndex > 0 && !smartAdjust) {
          const prevRange = rangesArray[currentIndex - 1]
          
          // If there's an overlap before current range (prev.max >= current.min)
          if (prevRange.max >= currentRangeData.min) {
            // Suggest adjusting previous range's max to be just before current range's min
            const suggestedMax = parseFloat((currentRangeData.min - 0.01).toFixed(2))
            
            // Ensure the suggested max is not less than the previous range's min
            let finalMax = suggestedMax
            if (suggestedMax <= prevRange.min) {
              // If adjusting max would make it <= min, adjust min instead
              finalMax = parseFloat(prevRange.max.toFixed(2))
              smartAdjust = {
                targetRange: prevRange.name,
                targetRangeLabel: prevRange.label || prevRange.name.charAt(0).toUpperCase() + prevRange.name.slice(1),
                adjustment: {
                  min: parseFloat((suggestedMax - 1.0).toFixed(2)), // Set min to be 1g below the max
                  max: finalMax
                },
                issue: {
                  type: 'overlap',
                  from: prevRange.max,
                  to: currentRangeData.min,
                  between: `${prevRange.name} and ${rangeType}`
                }
              }
            } else {
              smartAdjust = {
                targetRange: prevRange.name,
                targetRangeLabel: prevRange.label || prevRange.name.charAt(0).toUpperCase() + prevRange.name.slice(1),
                adjustment: {
                  min: parseFloat(prevRange.min.toFixed(2)), // Keep the min the same, ensure 2 decimal places
                  max: finalMax
                },
                issue: {
                  type: 'overlap',
                  from: prevRange.max,
                  to: currentRangeData.min,
                  between: `${prevRange.name} and ${rangeType}`
                }
              }
            }
          }
          // If there's a gap before current range (prev.max < current.min)
          else if (prevRange.max + 0.01 < currentRangeData.min && !smartAdjust) {
            const suggestedMax = parseFloat((currentRangeData.min - 0.01).toFixed(2))
            smartAdjust = {
              targetRange: prevRange.name,
              targetRangeLabel: prevRange.label || prevRange.name.charAt(0).toUpperCase() + prevRange.name.slice(1),
              adjustment: {
                min: parseFloat(prevRange.min.toFixed(2)), // Keep the min the same, ensure 2 decimal places
                max: suggestedMax
              },
              issue: {
                type: 'gap',
                from: prevRange.max,
                to: currentRangeData.min,
                between: `${prevRange.name} and ${rangeType}`
              }
            }
          }
        }
      }
      
      setSmartAdjustment(smartAdjust)
      
      // Validation is valid if there are no basic errors (invalid range, negative values)
      // Overlaps and gaps are warnings and don't prevent saving - smart adjustment can fix them
      setValidation({
        isValid: relevantErrors.length === 0,
        errors: relevantErrors,
        warnings: relevantWarnings,
        hasGaps: hasGaps,
        hasOverlaps: hasOverlaps
      })
    }

    validate()
  }, [minValue, maxValue, rangeType, allRanges, currentRange.label, validation?.hasGaps])

  const handleSmartAdjust = async () => {
    if (!smartAdjustment) return
    
    const min = parseFloat(minValue)
    const max = parseFloat(maxValue)
    
    if (isNaN(min) || isNaN(max)) {
      return
    }

    // Only block if validation is invalid (gaps are warnings, not errors)
    if (!validation?.isValid) {
      return
    }
    
    setSaving(true)
    try {
      // Save current range, the primary adjusted range, and any cascading adjustments
      // Pass cascading adjustments as additional parameter
      await onSave(
        { min, max, label: currentRange.label },
        {
          rangeType: smartAdjustment.targetRange,
          range: smartAdjustment.adjustment,
          label: smartAdjustment.targetRangeLabel,
          issueType: smartAdjustment.issue.type, // 'gap' or 'overlap'
          cascadingAdjustments: smartAdjustment.cascadingAdjustments || []
        }
      )
    } catch (error) {
      devError('Error saving with smart adjustment:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    const min = parseFloat(minValue)
    const max = parseFloat(maxValue)

    if (isNaN(min) || isNaN(max)) {
      return
    }

    // Only block if validation is invalid (gaps are warnings, not errors)
    if (!validation?.isValid) {
      return
    }

    setSaving(true)
    try {
      // Save only current range
      await onSave({ min, max, label: currentRange.label })
    } catch (error) {
      devError('Error saving range:', error)
    } finally {
      setSaving(false)
    }
  }

  const getRangeColor = () => {
    switch (rangeType) {
      case 'small': return { bg: '#105588', hover: '#0d4470' }
      case 'medium': return { bg: '#F69664', hover: '#f5854a' }
      case 'large': return { bg: '#FF4A08', hover: '#e64207' }
      default: return { bg: '#105588', hover: '#0d4470' }
    }
  }

  const colors = getRangeColor()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 border border-gray-300">
        {/* Header */}
        <div className="text-white p-4 rounded-t-2xl flex items-center justify-between" style={{ backgroundColor: colors.bg }}>
          <h2 className="text-xl font-bold">
            Edit {currentRange.label || rangeType.charAt(0).toUpperCase() + rangeType.slice(1)} Range
          </h2>
          <button
            onClick={onCancel}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Input Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum (g)
              </label>
              <input
                type="number"
                step="0.01"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validation?.errors.length > 0
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300'
                }`}
                style={validation?.errors.length === 0 ? { '--tw-ring-color': '#105588' } : {}}
                placeholder="35.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum (g)
              </label>
              <input
                type="number"
                step="0.01"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validation?.errors.length > 0
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300'
                }`}
                style={validation?.errors.length === 0 ? { '--tw-ring-color': '#105588' } : {}}
                placeholder="42.00"
              />
            </div>
          </div>

          {/* Validation Messages */}
          {validation && (
            <div className="space-y-2">
              {/* Errors */}
              {validation.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 mb-1">Validation Errors</p>
                      <ul className="text-xs text-red-700 space-y-1">
                        {validation.errors.map((error, index) => (
                          <li key={index}>• {error.message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Smart Adjustment Info - Show when available */}
              {smartAdjustment && validation.isValid && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800 mb-1">Smart Adjustment Available</p>
                      <p className="text-xs text-blue-700">
                        {smartAdjustment.issue.type === 'overlap' 
                          ? `Resolve overlap by adjusting ${smartAdjustment.targetRangeLabel} range to ${smartAdjustment.adjustment.min.toFixed(2)}g - ${smartAdjustment.adjustment.max.toFixed(2)}g`
                          : `Close gap by adjusting ${smartAdjustment.targetRangeLabel} range to ${smartAdjustment.adjustment.min.toFixed(2)}g - ${smartAdjustment.adjustment.max.toFixed(2)}g`
                        }
                        {smartAdjustment.cascadingAdjustments && smartAdjustment.cascadingAdjustments.length > 0 && (
                          <>
                            {smartAdjustment.cascadingAdjustments.map((cascading, idx) => (
                              <span key={idx}>
                                {idx === 0 ? ', ' : ', '}
                                {cascading.targetRangeLabel}: {cascading.adjustment.min.toFixed(2)}g - {cascading.adjustment.max.toFixed(2)}g
                              </span>
                            ))}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings (only show if no smart adjustment available) */}
              {validation.warnings.length > 0 && !smartAdjustment && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800 mb-1">
                        {validation.hasOverlaps ? 'Overlap Detected' : 'Gap Detected'}
                      </p>
                      <p className="text-xs text-yellow-700">
                        {validation.warnings[0]?.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success - Only show when valid and no warnings/smart adjustment */}
              {validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && !smartAdjustment && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-700">Range is valid</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            {/* Show Smart Adjustment button if available, otherwise show regular Save button */}
            {smartAdjustment && validation.isValid ? (
              <button
                onClick={handleSmartAdjust}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors"
                style={{
                  backgroundColor: !saving ? '#2563EB' : '#9CA3AF',
                  cursor: !saving ? 'pointer' : 'not-allowed'
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.target.style.backgroundColor = '#1D4ED8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.target.style.backgroundColor = '#2563EB'
                  }
                }}
              >
                {saving ? 'Saving...' : 'Smart Save'}
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!validation?.isValid || saving}
                className="flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors"
                style={{
                  backgroundColor: validation?.isValid && !saving ? colors.bg : '#9CA3AF',
                  cursor: validation?.isValid && !saving ? 'pointer' : 'not-allowed'
                }}
                onMouseEnter={(e) => {
                  if (validation?.isValid && !saving) {
                    e.target.style.backgroundColor = colors.hover
                  }
                }}
                onMouseLeave={(e) => {
                  if (validation?.isValid && !saving) {
                    e.target.style.backgroundColor = colors.bg
                  }
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
