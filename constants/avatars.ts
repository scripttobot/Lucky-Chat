export interface AvatarPreset {
  id: string;
  emoji: string;
  bgColor: string;
  isPremium?: boolean;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'av1', emoji: '😊', bgColor: '#4CAF50' },
  { id: 'av2', emoji: '😎', bgColor: '#2196F3' },
  { id: 'av3', emoji: '🤩', bgColor: '#FF9800' },
  { id: 'av4', emoji: '😇', bgColor: '#9C27B0' },
  { id: 'av5', emoji: '🥳', bgColor: '#E91E63' },
  { id: 'av6', emoji: '🤗', bgColor: '#00BCD4' },
  { id: 'av7', emoji: '😜', bgColor: '#FF5722' },
  { id: 'av8', emoji: '🦊', bgColor: '#607D8B' },
  { id: 'av9', emoji: '🐱', bgColor: '#795548' },
  { id: 'av10', emoji: '🐶', bgColor: '#8BC34A' },
  { id: 'av11', emoji: '🦁', bgColor: '#FFC107' },
  { id: 'av12', emoji: '🐼', bgColor: '#37474F' },
  { id: 'av13', emoji: '🦄', bgColor: '#AB47BC' },
  { id: 'av14', emoji: '🐸', bgColor: '#66BB6A' },
  { id: 'av15', emoji: '🦋', bgColor: '#29B6F6' },
  { id: 'av16', emoji: '🌸', bgColor: '#EC407A' },
  { id: 'av17', emoji: '⚡', bgColor: '#FFA726' },
  { id: 'av18', emoji: '🔥', bgColor: '#EF5350' },
  { id: 'av19', emoji: '💎', bgColor: '#42A5F5' },
  { id: 'av20', emoji: '🎯', bgColor: '#26A69A' },
  { id: 'av21', emoji: '🎮', bgColor: '#7E57C2' },
  { id: 'av22', emoji: '🎵', bgColor: '#EF5350' },
  { id: 'av23', emoji: '🌙', bgColor: '#5C6BC0' },
  { id: 'av24', emoji: '☀️', bgColor: '#FFB300' },

  { id: 'pav1', emoji: '🐉', bgColor: '#D32F2F', isPremium: true },
  { id: 'pav2', emoji: '🦅', bgColor: '#1565C0', isPremium: true },
  { id: 'pav3', emoji: '🐺', bgColor: '#455A64', isPremium: true },
  { id: 'pav4', emoji: '🦈', bgColor: '#0277BD', isPremium: true },
  { id: 'pav5', emoji: '🦚', bgColor: '#00695C', isPremium: true },
  { id: 'pav6', emoji: '🦩', bgColor: '#C2185B', isPremium: true },
  { id: 'pav7', emoji: '🐅', bgColor: '#E65100', isPremium: true },
  { id: 'pav8', emoji: '🦖', bgColor: '#2E7D32', isPremium: true },
  { id: 'pav9', emoji: '🦜', bgColor: '#F9A825', isPremium: true },
  { id: 'pav10', emoji: '🐙', bgColor: '#6A1B9A', isPremium: true },
  { id: 'pav11', emoji: '🦂', bgColor: '#BF360C', isPremium: true },
  { id: 'pav12', emoji: '🐲', bgColor: '#880E4F', isPremium: true },
  { id: 'pav13', emoji: '🦞', bgColor: '#B71C1C', isPremium: true },
  { id: 'pav14', emoji: '🐬', bgColor: '#0097A7', isPremium: true },
  { id: 'pav15', emoji: '🦉', bgColor: '#4E342E', isPremium: true },
  { id: 'pav16', emoji: '🌺', bgColor: '#AD1457', isPremium: true },
  { id: 'pav17', emoji: '🍀', bgColor: '#1B5E20', isPremium: true },
  { id: 'pav18', emoji: '🌊', bgColor: '#01579B', isPremium: true },
  { id: 'pav19', emoji: '🌋', bgColor: '#4A148C', isPremium: true },
  { id: 'pav20', emoji: '❄️', bgColor: '#0D47A1', isPremium: true },
  { id: 'pav21', emoji: '🔮', bgColor: '#311B92', isPremium: true },
  { id: 'pav22', emoji: '👑', bgColor: '#FF6F00', isPremium: true },
  { id: 'pav23', emoji: '🗡️', bgColor: '#263238', isPremium: true },
  { id: 'pav24', emoji: '🛡️', bgColor: '#1A237E', isPremium: true },
  { id: 'pav25', emoji: '🏆', bgColor: '#F57F17', isPremium: true },
  { id: 'pav26', emoji: '🎭', bgColor: '#4A148C', isPremium: true },
  { id: 'pav27', emoji: '🧊', bgColor: '#006064', isPremium: true },
  { id: 'pav28', emoji: '🌠', bgColor: '#1A237E', isPremium: true },
  { id: 'pav29', emoji: '🎪', bgColor: '#880E4F', isPremium: true },
  { id: 'pav30', emoji: '🧬', bgColor: '#004D40', isPremium: true },
  { id: 'pav31', emoji: '⚜️', bgColor: '#827717', isPremium: true },
  { id: 'pav32', emoji: '🔱', bgColor: '#0D47A1', isPremium: true },
];

export const FREE_AVATARS = AVATAR_PRESETS.filter((a) => !a.isPremium);
export const PREMIUM_AVATARS = AVATAR_PRESETS.filter((a) => a.isPremium);

export function getAvatarPreset(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((a) => a.id === id);
}

export function isAvatarPremium(id: string): boolean {
  const preset = getAvatarPreset(id);
  return !!preset?.isPremium;
}
