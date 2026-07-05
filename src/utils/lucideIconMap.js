// src/utils/lucideIconMap.js
// Mapa CURADO de ícones lucide-react usados no sistema de categorias.
// Importar SÓ esses garante bundle enxuto e serve como whitelist de UX
// (o admin só consegue escolher entre esses no seletor).
//
// Como usar:
//   import { getLucideIcon, CATEGORY_ICON_LIST } from '../utils/lucideIconMap';
//   const Icon = getLucideIcon('GraduationCap');
//   <Icon size={16} />

import {
  // Desenvolvimento
  Code,
  Terminal,
  Cpu,
  Database,
  GitBranch,
  Package,
  Layers,
  Server,
  FileCode,
  Boxes,
  // Design
  Palette,
  Brush,
  PenTool,
  Image,
  // Aprendizado
  GraduationCap,
  BookOpen,
  Book,
  Lightbulb,
  Brain,
  // Mídia
  Music,
  Camera,
  Film,
  Video,
  Headphones,
  // Games
  Gamepad2,
  Puzzle,
  Trophy,
  Target,
  Dice6,
  // Negócios
  Briefcase,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Building,
  // Utilidade
  Wrench,
  Settings,
  Shield,
  Zap,
  Rocket,
  Timer,
  Clock,
  // Comunicação
  Mail,
  Users,
  Globe,
  MessageCircle,
  // Diversos
  Heart,
  Star,
  Sparkles,
  Bookmark,
  Flag,
  Tag,
} from 'lucide-react';

// Ordem = ordem no seletor. Categorizado por grupo visual.
export const CATEGORY_ICON_LIST = [
  // Desenvolvimento
  { name: 'Code', Icon: Code, group: 'Desenvolvimento' },
  { name: 'Terminal', Icon: Terminal, group: 'Desenvolvimento' },
  { name: 'Cpu', Icon: Cpu, group: 'Desenvolvimento' },
  { name: 'Database', Icon: Database, group: 'Desenvolvimento' },
  { name: 'GitBranch', Icon: GitBranch, group: 'Desenvolvimento' },
  { name: 'Package', Icon: Package, group: 'Desenvolvimento' },
  { name: 'Layers', Icon: Layers, group: 'Desenvolvimento' },
  { name: 'Server', Icon: Server, group: 'Desenvolvimento' },
  { name: 'FileCode', Icon: FileCode, group: 'Desenvolvimento' },
  { name: 'Boxes', Icon: Boxes, group: 'Desenvolvimento' },

  // Design
  { name: 'Palette', Icon: Palette, group: 'Design' },
  { name: 'Brush', Icon: Brush, group: 'Design' },
  { name: 'PenTool', Icon: PenTool, group: 'Design' },
  { name: 'Image', Icon: Image, group: 'Design' },

  // Aprendizado
  { name: 'GraduationCap', Icon: GraduationCap, group: 'Aprendizado' },
  { name: 'BookOpen', Icon: BookOpen, group: 'Aprendizado' },
  { name: 'Book', Icon: Book, group: 'Aprendizado' },
  { name: 'Lightbulb', Icon: Lightbulb, group: 'Aprendizado' },
  { name: 'Brain', Icon: Brain, group: 'Aprendizado' },

  // Midia
  { name: 'Music', Icon: Music, group: 'Midia' },
  { name: 'Camera', Icon: Camera, group: 'Midia' },
  { name: 'Film', Icon: Film, group: 'Midia' },
  { name: 'Video', Icon: Video, group: 'Midia' },
  { name: 'Headphones', Icon: Headphones, group: 'Midia' },

  // Games
  { name: 'Gamepad2', Icon: Gamepad2, group: 'Games' },
  { name: 'Puzzle', Icon: Puzzle, group: 'Games' },
  { name: 'Trophy', Icon: Trophy, group: 'Games' },
  { name: 'Target', Icon: Target, group: 'Games' },
  { name: 'Dice6', Icon: Dice6, group: 'Games' },

  // Negocios
  { name: 'Briefcase', Icon: Briefcase, group: 'Negocios' },
  { name: 'ShoppingBag', Icon: ShoppingBag, group: 'Negocios' },
  { name: 'TrendingUp', Icon: TrendingUp, group: 'Negocios' },
  { name: 'DollarSign', Icon: DollarSign, group: 'Negocios' },
  { name: 'Building', Icon: Building, group: 'Negocios' },

  // Utilidade
  { name: 'Wrench', Icon: Wrench, group: 'Utilidade' },
  { name: 'Settings', Icon: Settings, group: 'Utilidade' },
  { name: 'Shield', Icon: Shield, group: 'Utilidade' },
  { name: 'Zap', Icon: Zap, group: 'Utilidade' },
  { name: 'Rocket', Icon: Rocket, group: 'Utilidade' },
  { name: 'Timer', Icon: Timer, group: 'Utilidade' },
  { name: 'Clock', Icon: Clock, group: 'Utilidade' },

  // Comunicacao
  { name: 'Mail', Icon: Mail, group: 'Comunicacao' },
  { name: 'Users', Icon: Users, group: 'Comunicacao' },
  { name: 'Globe', Icon: Globe, group: 'Comunicacao' },
  { name: 'MessageCircle', Icon: MessageCircle, group: 'Comunicacao' },

  // Diversos
  { name: 'Heart', Icon: Heart, group: 'Diversos' },
  { name: 'Star', Icon: Star, group: 'Diversos' },
  { name: 'Sparkles', Icon: Sparkles, group: 'Diversos' },
  { name: 'Bookmark', Icon: Bookmark, group: 'Diversos' },
  { name: 'Flag', Icon: Flag, group: 'Diversos' },
];

// Índice { name: Component } para resolver rapidamente.
const CATEGORY_ICON_MAP = CATEGORY_ICON_LIST.reduce((acc, { name, Icon }) => {
  acc[name] = Icon;
  return acc;
}, {});

// Ícone fallback (quando categoria não tem ícone salvo, ou o nome não bate no mapa).
export const FallbackCategoryIcon = Tag;

// Resolve um nome de ícone para o componente lucide correspondente.
// Retorna o fallback (Tag) se o nome não estiver no mapa curado.
export function getLucideIcon(name) {
  if (!name) return FallbackCategoryIcon;
  return CATEGORY_ICON_MAP[name] || FallbackCategoryIcon;
}
