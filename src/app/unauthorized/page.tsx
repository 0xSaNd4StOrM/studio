export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-8">
          Your account does not have permission to access this dashboard. Please use the correct
          login for your agency, or contact support.
        </p>
        <a
          href="/admin"
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Back to Login
        </a>
      </div>
    </div>
  );
}
