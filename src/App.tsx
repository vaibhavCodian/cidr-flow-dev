import React from 'react';
// Import icons from react-icons
import { FiMoon, FiSun, FiGitBranch } from 'react-icons/fi';
import SubnetCalculator from './components/SubnetCalculator';
// Import useTheme directly
import { useTheme } from './context/ThemeContext';

function App() {
  // useTheme now works correctly as ThemeProvider is wrapping App in main.tsx
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    // No ThemeProvider wrapper needed here anymore
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-dark-primary text-white' : 'bg-white text-gray-900'}`}>
      <nav className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-700'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FiGitBranch className="w-8 h-8 text-blue-500 mr-3" />
              <h1 className="text-2xl font-montserrat font-bold">CIDR-Flow</h1>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${
                isDarkMode
                  ? 'hover:bg-dark-tertiary text-gray-300 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SubnetCalculator />
      </main>
    </div>
    // No closing ThemeProvider tag needed here
  );
}

// App component no longer needs ThemeProvider wrapping it
// export default App; // Keep the export

// Wrap App export with React.memo potentially if needed, but not required for theme fix
export default App;