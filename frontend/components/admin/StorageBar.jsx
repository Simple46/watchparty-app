// Storage usage progress bar
// Shows used/total GB with a color-coded progress bar
export default function StorageBar({ usedGB, limitGB, percentage }) {
  // Color changes based on how full storage is
  // Green → safe, Yellow → getting full, Red → almost full
  const getBarColor = () => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getTextColor = () => {
    if (percentage >= 90) return "text-red-400";
    if (percentage >= 70) return "text-yellow-400";
    return "text-green-400";
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white font-semibold text-sm">Cloudinary Storage</p>
        <span className={`text-sm font-bold ${getTextColor()}`}>
          {percentage}% used
        </span>
      </div>

      {/* Progress bar track */}
      <div className="w-full bg-gray-800 rounded-full h-3 mb-3">
        {/* Progress bar fill */}
        <div
          className={`h-3 rounded-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-xs">{usedGB} GB used</p>
        <p className="text-gray-400 text-xs">{limitGB} GB total (free tier)</p>
      </div>

      {/* Warning message when running low */}
      {percentage >= 80 && (
        <div
          className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30
                        rounded-lg"
        >
          <p className="text-yellow-400 text-xs">
            ⚠️ Storage is getting full. Consider deleting old movies before
            uploading new ones.
          </p>
        </div>
      )}
    </div>
  );
}
