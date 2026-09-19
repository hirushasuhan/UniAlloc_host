const fs = require('fs');
const path = require('path');

const ICON_MAP = {
  LayoutDashboard: 'HiOutlineSquares2X2',
  Users: 'HiOutlineUsers',
  BookOpen: 'HiOutlineBookOpen',
  BarChart2: 'HiOutlineChartBar',
  Bell: 'HiOutlineBell',
  Settings: 'HiOutlineCog6Tooth',
  LogOut: 'HiOutlineArrowRightOnRectangle',
  FileText: 'HiOutlineDocumentText',
  Send: 'HiOutlinePaperAirplane',
  Award: 'HiOutlineTrophy',
  ClipboardList: 'HiOutlineClipboardDocumentList',
  Briefcase: 'HiOutlineBriefcase',
  Inbox: 'HiOutlineInbox',
  Search: 'HiOutlineMagnifyingGlass',
  RefreshCw: 'HiOutlineArrowPath',
  Plus: 'HiOutlinePlus',
  X: 'HiOutlineXMark',
  ChevronDown: 'HiOutlineChevronDown',
  ChevronUp: 'HiOutlineChevronUp',
  CheckCircle: 'HiOutlineCheckCircle',
  XCircle: 'HiOutlineXCircle',
  ShieldAlert: 'HiOutlineShieldExclamation',
  Save: 'HiOutlineDocumentCheck',
  UserCheck: 'HiOutlineUserPlus',
  UserX: 'HiOutlineUserMinus',
  AlertTriangle: 'HiOutlineExclamationTriangle',
  CheckCheck: 'HiOutlineCheckBadge',
  Sparkles: 'HiOutlineSparkles',
};

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('lucide-react')) {
        let importsToReplace = [];
        
        // Find import { ... } from 'lucide-react'
        const regex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;
        
        content = content.replace(regex, (fullMatch, p1) => {
          const imports = p1.split(',').map(i => i.trim()).filter(Boolean);
          const newImports = imports.map(i => ICON_MAP[i] || i);
          
          imports.forEach((imp, idx) => {
            if (ICON_MAP[imp]) importsToReplace.push({old: imp, new: ICON_MAP[imp]});
          });
          
          return `import { ${newImports.join(', ')} } from 'react-icons/hi2'`;
        });
        
        // Replace usages in code
        importsToReplace.forEach(({old, new: newName}) => {
          // Replace <OldIcon ... /> or <OldIcon>
          const tagRegex = new RegExp(`<${old}([ >\\/])`, 'g');
          content = content.replace(tagRegex, `<${newName}$1`);
        });

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated ' + fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
