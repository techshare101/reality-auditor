export default function TestGlassPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Glassmorphism Test Page
        </h1>

        {/* Glass Card Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-3">Basic Glass Card</h2>
            <p className="text-gray-300">
              This is a basic glass card with backdrop blur and semi-transparent background.
            </p>
          </div>

          <div className="glass-card p-6 hover:scale-105 transition-transform">
            <h2 className="text-xl font-bold mb-3">Hover Effect</h2>
            <p className="text-gray-300">
              This card scales up on hover with smooth transitions.
            </p>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-3">With Button</h2>
            <p className="text-gray-300 mb-4">
              Glass card with a glass button inside.
            </p>
            <button className="glass-button w-full">
              Click Me
            </button>
          </div>
        </div>

        {/* Form Example */}
        <div className="max-w-md mx-auto">
          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold mb-6">Glass Form</h2>
            <form className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                className="glass-input"
              />
              <input
                type="password"
                placeholder="Password"
                className="glass-input"
              />
              <button type="submit" className="glass-button w-full">
                Submit
              </button>
            </form>
          </div>
        </div>

        {/* Color Variations */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center mb-6">Color Variations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-6 bg-purple-500/10 border-purple-500/20">
              <h3 className="text-lg font-bold text-purple-300">Purple Tint</h3>
              <p className="text-purple-200">With purple accent colors</p>
            </div>
            <div className="glass-card p-6 bg-blue-500/10 border-blue-500/20">
              <h3 className="text-lg font-bold text-blue-300">Blue Tint</h3>
              <p className="text-blue-200">With blue accent colors</p>
            </div>
            <div className="glass-card p-6 bg-green-500/10 border-green-500/20">
              <h3 className="text-lg font-bold text-green-300">Green Tint</h3>
              <p className="text-green-200">With green accent colors</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
