import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mapping dari lucide-react ke react-icons
const iconMapping = {
  'Bell': 'FaBell',
  'X': 'FaTimes',
  'Check': 'FaCheck',
  'CheckCheck': 'FaCheckDouble',
  'Trash2': 'FaTrash',
  'ExternalLink': 'FaExternalLinkAlt',
  'RefreshCw': 'FaSync',
  'Home': 'FaHome',
  'Users': 'FaUsers',
  'DollarSign': 'FaDollarSign',
  'CreditCard': 'FaCreditCard',
  'Receipt': 'FaReceipt',
  'FileText': 'FaFileText',
  'Settings': 'FaCog',
  'LogOut': 'FaSignOutAlt',
  'Plus': 'FaPlus',
  'Search': 'FaSearch',
  'Filter': 'FaFilter',
  'Pencil': 'FaPencilAlt',
  'AlertTriangle': 'FaExclamationTriangle',
  'Building2': 'FaBuilding',
  'Eye': 'FaEye',
  'EyeOff': 'FaEyeSlash',
  'UserPlus': 'FaUserPlus',
  'Upload': 'FaUpload',
  'Download': 'FaDownload',
  'Calendar': 'FaCalendar',
  'Database': 'FaDatabase',
  'User': 'FaUser',
  'Mail': 'FaMail',
  'Phone': 'FaPhone',
  'MapPin': 'FaMapMarkerAlt',
  'Save': 'FaSave',
  'Edit3': 'FaEdit',
  'Shield': 'FaShield',
  'Crown': 'FaCrown',
  'Play': 'FaPlay',
  'Pause': 'FaPause',
  'Square': 'FaSquare',
  'Copy': 'FaCopy',
  'MessageSquare': 'FaComment',
  'Send': 'FaPaperPlane',
  'ToggleLeft': 'FaToggleOff',
  'ToggleRight': 'FaToggleOn',
  'ChevronDown': 'FaChevronDown',
  'Printer': 'FaPrint',
  'CheckCircle': 'FaCheckCircle',
  'Clock': 'FaClock',
  'DivideIcon': 'FaDivide'
};

function replaceIconsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace import statement
    const importRegex = /import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/g;
    const match = content.match(importRegex);
    
    if (match) {
      const importMatch = match[0];
      const iconsMatch = importMatch.match(/{([^}]+)}/)[1];
      const icons = iconsMatch.split(',').map(icon => icon.trim());
      
      // Map icons to react-icons equivalents
      const mappedIcons = icons.map(icon => {
        const mapped = iconMapping[icon];
        if (!mapped) {
          console.warn(`Warning: No mapping found for icon '${icon}' in ${filePath}`);
          return icon; // Keep original if no mapping
        }
        return mapped;
      });
      
      // Create new import statement
      const newImport = `import { ${mappedIcons.join(', ')} } from 'react-icons/fa'`;
      
      // Replace the import
      content = content.replace(importRegex, newImport);
      
      // Replace icon usage in JSX
      icons.forEach(icon => {
        const mapped = iconMapping[icon];
        if (mapped) {
          const iconRegex = new RegExp(`<${icon}([^>]*)>`, 'g');
          content = content.replace(iconRegex, `<${mapped}$1>`);
          
          const selfClosingRegex = new RegExp(`<${icon}([^>]*)/?>`, 'g');
          content = content.replace(selfClosingRegex, `<${mapped}$1 />`);
        }
      });
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('lucide-react')) {
        replaceIconsInFile(filePath);
      }
    }
  });
}

// Start from src directory
const srcDir = path.join(__dirname, '..', 'src');
console.log('Replacing lucide-react icons with react-icons...');
walkDirectory(srcDir);
console.log('Icon replacement completed!');