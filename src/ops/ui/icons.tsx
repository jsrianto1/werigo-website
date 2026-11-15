import type { SVGProps } from 'react';

// One compact, rounded, two-tone family across navigation, forms and feedback.
type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };
const shapes: Record<string, string> = {
  LayoutDashboard:'M4 4h6v7H4z M14 4h6v4h-6z M4 15h6v5H4z M14 12h6v8h-6z',
  Bike:'M9 8h4l4 9 M7 17l4-9 M6 7h3 M14 5h3l2 5 M8 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M22 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M7 17h10',
  CalendarDays:'M7 3v4 M17 3v4 M4 10h16 M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2 M8 14h1 M15 14h1 M8 17h1',
  CalendarPlus:'M7 3v4 M17 3v4 M4 10h16 M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2 M12 13v5 M9.5 15.5h5',
  Users:'M14 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M3 20v-2a6 6 0 0 1 12 0v2 M17 5a3 3 0 0 1 0 6 M18 14a5 5 0 0 1 3 4v2',
  UserRoundPlus:'M14 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M3 20v-2a6 6 0 0 1 10-4 M18 13v8 M14 17h8',
  ClipboardCheck:'M9 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3 M9 3h6v4H9z M8 14l3 3 5-6',
  Wallet:'M20 8H6a2 2 0 0 1 0-4h12v4 M4 6v13a2 2 0 0 0 2 2h14V8 M20 12h-5v5h5 M17 14.5h.01',
  ChartNoAxesCombined:'M4 4v16h17 M7 14l4-5 4 3 6-7 M17 5h4v4',
  MessageSquare:'M7 4h10a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H9l-6 3V8a4 4 0 0 1 4-4 M7 9h10 M7 13h6',
  NotebookPen:'M16 4H6a2 2 0 0 0-2 2v14h12v-5 M2 9h4 M2 15h4 M11 12l8-8 3 3-8 8-4 1z',
  BookOpen:'M12 6c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1v15',
  Settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  Plus:'M12 5v14 M5 12h14', Search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M15 15l6 6',
  ArrowUpRight:'M6 18 18 6 M7 6h11v11', ArrowRight:'M4 12h16 M14 6l6 6-6 6', ArrowDownLeft:'M18 6 6 18 M6 7v11h11',
  ArrowUpFromLine:'M12 17V3 M7 8l5-5 5 5 M4 16v5h16v-5',
  ChevronRight:'M9 5l7 7-7 7',ChevronLeft:'M15 5l-7 7 7 7',ChevronDown:'M5 9l7 7 7-7',
  RefreshCw:'M20 9a8 8 0 0 0-14-4L3 8 M3 3v5h5 M4 15a8 8 0 0 0 14 4l3-3 M21 21v-5h-5',
  RotateCcw:'M4 10a8 8 0 1 1 1 8 M4 4v6h6', Undo2:'M4 10h10a6 6 0 0 1 0 12 M9 5l-5 5 5 5',
  LoaderCircle:'M12 3a9 9 0 1 1-9 9',Check:'M5 12l4 4L19 6',CheckCheck:'M2 12l4 4L16 6 M11 14l2 2L23 6',
  CheckCircle2:'M21 12a9 9 0 1 1-4-7 M8 11l4 4 9-10',AlertCircle:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v6 M12 17h.01',
  Clock3:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 6v6h5',MapPin:'M19 10c0 6-7 12-7 12S5 16 5 10a7 7 0 0 1 14 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  Star:'m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',Download:'M12 3v13 M7 11l5 5 5-5 M4 17v4h16v-4',
  Menu:'M4 6h16 M4 12h12 M4 18h16',X:'M6 6l12 12 M18 6 6 18',LogOut:'M10 3H4v18h6 M9 12h13 M17 7l5 5-5 5',
  ShieldCheck:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z M8 12l3 3 5-6',Smartphone:'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 M10 5h4 M11 19h2',
  Printer:'M7 8V3h10v5 M7 17H3v-7h18v7h-4 M7 14h10v8H7z M17 11h1',FileText:'M14 2H5v20h14V7z M14 2v5h5 M8 12h8 M8 16h6',
  FileSpreadsheet:'M14 2H5v20h14V7z M14 2v5h5 M8 11h8v7H8z M12 11v7 M8 14.5h8',
  ExternalLink:'M10 4H4v16h16v-6 M13 3h8v8 M10 14 21 3',Camera:'M8 6l2-3h4l2 3h5v15H3V6z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  TriangleAlert:'M12 3 1 21h22z M12 9v5 M12 18h.01',Bell:'M5 16v-5a7 7 0 0 1 14 0v5l2 3H3z M9 22h6 M12 2V1',
  LockKeyhole:'M7 10V7a5 5 0 0 1 10 0v3 M4 10h16v12H4z M12 14v4',
  ImagePlus:'M14 3H3v18h18V10 M3 16l5-5 8 10 M15 6h8 M19 2v8 M10 7h.01',Trash2:'M3 6h18 M9 6V3h6v3 M5 6l1 16h12l1-16 M10 10v8 M14 10v8',
  Inbox:'M3 13l3-9h12l3 9v8H3z M3 13h5l2 3h4l2-3h5',Info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 11v6 M12 7h.01',
  Activity:'M2 12h5l3-8 4 16 3-8h5',Share2:'M8 11l8-5 M8 13l8 5 M8 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M22 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M22 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  TrendingUp:'M3 17l7-7 4 4 7-10 M15 4h6v6',
};
function icon(name: string) {
  const Component = ({size=24,strokeWidth=1.7,children,...props}:IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} className={`ops-icon ${props.className||''}`}><path d={shapes[name]} strokeWidth="5" opacity=".075"/><path d={shapes[name]}/>{children}</svg>;
  Component.displayName = name;
  return Component;
}
export const LayoutDashboard=icon('LayoutDashboard'), Bike=icon('Bike'), CalendarDays=icon('CalendarDays'), CalendarPlus=icon('CalendarPlus'), Users=icon('Users'), UserRoundPlus=icon('UserRoundPlus'), ClipboardCheck=icon('ClipboardCheck'), Wallet=icon('Wallet'), ChartNoAxesCombined=icon('ChartNoAxesCombined'), MessageSquare=icon('MessageSquare'), NotebookPen=icon('NotebookPen'), BookOpen=icon('BookOpen'), Settings=icon('Settings'), Plus=icon('Plus'), Search=icon('Search'), ArrowUpRight=icon('ArrowUpRight'), ArrowRight=icon('ArrowRight'), ArrowDownLeft=icon('ArrowDownLeft'), ArrowUpFromLine=icon('ArrowUpFromLine'), ChevronRight=icon('ChevronRight'), ChevronLeft=icon('ChevronLeft'), ChevronDown=icon('ChevronDown'), RefreshCw=icon('RefreshCw'), RotateCcw=icon('RotateCcw'), Undo2=icon('Undo2'), LoaderCircle=icon('LoaderCircle'), Check=icon('Check'), CheckCheck=icon('CheckCheck'), CheckCircle2=icon('CheckCircle2'), AlertCircle=icon('AlertCircle'), Clock3=icon('Clock3'), MapPin=icon('MapPin'), Star=icon('Star'), Download=icon('Download'), Menu=icon('Menu'), X=icon('X'), LogOut=icon('LogOut'), ShieldCheck=icon('ShieldCheck'), Smartphone=icon('Smartphone'), Printer=icon('Printer'), FileText=icon('FileText'), FileSpreadsheet=icon('FileSpreadsheet'), ExternalLink=icon('ExternalLink'), Camera=icon('Camera'), TriangleAlert=icon('TriangleAlert'), Bell=icon('Bell'), LockKeyhole=icon('LockKeyhole'), ImagePlus=icon('ImagePlus'), Trash2=icon('Trash2'), Inbox=icon('Inbox'), Info=icon('Info'), Activity=icon('Activity'), Share2=icon('Share2'), TrendingUp=icon('TrendingUp');
