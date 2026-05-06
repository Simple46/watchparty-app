// A clean stat card for the dashboard
// Shows an icon, a label and a number
export default function StatCard({
  title,
  value,
  icon: Icon,
  color = "red",
  subtitle,
}) {
  const colorMap = {
    red: "bg-red-600/15 text-red-400 border-red-600/30",
    blue: "bg-blue-600/15 text-blue-400 border-blue-600/30",
    green: "bg-green-600/15 text-green-400 border-green-600/30",
    yellow: "bg-yellow-600/15 text-yellow-400 border-yellow-600/30",
  };

  const iconColorMap = {
    red: "bg-red-600/20 text-red-400",
    blue: "bg-blue-600/20 text-blue-400",
    green: "bg-green-600/20 text-green-400",
    yellow: "bg-yellow-600/20 text-yellow-400",
  };

  return (
    <div
      className={`
        bg-gray-900 border rounded-xl p-6
        ${colorMap[color]}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <p className="text-white text-3xl font-bold">{value}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              ${iconColorMap[color]}
            `}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
