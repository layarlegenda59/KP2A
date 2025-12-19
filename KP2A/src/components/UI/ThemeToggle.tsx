import React from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5">
        {theme === 'light' ? (
          <FaSun className="w-5 h-5 text-yellow-500 transition-opacity duration-200" />
        ) : (
          <FaMoon className="w-5 h-5 text-blue-400 transition-opacity duration-200" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;