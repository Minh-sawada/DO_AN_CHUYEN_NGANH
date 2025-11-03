// Danh sách các avatar có sẵn
// Bao gồm cả avatar với chữ cái và sticker/emoji
export const PRESET_AVATARS = [
  // Style: initials với các màu sắc khác nhau
  {
    id: 'blue',
    name: 'Xanh dương',
    type: 'initial',
    url: (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff&size=200&bold=true`
  },
  {
    id: 'purple',
    name: 'Tím',
    type: 'initial',
    url: (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff&size=200&bold=true`
  },
  {
    id: 'green',
    name: 'Xanh lá',
    type: 'initial',
    url: (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff&size=200&bold=true`
  },
  {
    id: 'orange',
    name: 'Cam',
    type: 'initial',
    url: (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f59e0b&color=fff&size=200&bold=true`
  },
  {
    id: 'red',
    name: 'Đỏ',
    type: 'initial',
    url: (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ef4444&color=fff&size=200&bold=true`
  },
  {
    id: 'pink',
    name: 'Hồng',
    type: 'initial',
    url: (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ec4899&color=fff&size=200&bold=true`
  },
  // Stickers/Emoji
  {
    id: 'sticker-smile',
    name: 'Mặt cười',
    type: 'emoji',
    emoji: '😊',
    url: () => null // Sẽ render emoji trực tiếp
  },
  {
    id: 'sticker-cool',
    name: 'Cool',
    type: 'emoji',
    emoji: '😎',
    url: () => null
  },
  {
    id: 'sticker-heart',
    name: 'Trái tim',
    type: 'emoji',
    emoji: '❤️',
    url: () => null
  },
  {
    id: 'sticker-star',
    name: 'Ngôi sao',
    type: 'emoji',
    emoji: '⭐',
    url: () => null
  },
  {
    id: 'sticker-fire',
    name: 'Lửa',
    type: 'emoji',
    emoji: '🔥',
    url: () => null
  },
  {
    id: 'sticker-rocket',
    name: 'Tên lửa',
    type: 'emoji',
    emoji: '🚀',
    url: () => null
  },
  {
    id: 'sticker-law',
    name: 'Luật pháp',
    type: 'emoji',
    emoji: '⚖️',
    url: () => null
  },
  {
    id: 'sticker-book',
    name: 'Sách',
    type: 'emoji',
    emoji: '📚',
    url: () => null
  },
  {
    id: 'sticker-shield',
    name: 'Khiên',
    type: 'emoji',
    emoji: '🛡️',
    url: () => null
  },
  {
    id: 'sticker-lightbulb',
    name: 'Ý tưởng',
    type: 'emoji',
    emoji: '💡',
    url: () => null
  },
  {
    id: 'sticker-trophy',
    name: 'Cúp',
    type: 'emoji',
    emoji: '🏆',
    url: () => null
  },
  {
    id: 'sticker-clap',
    name: 'Vỗ tay',
    type: 'emoji',
    emoji: '👏',
    url: () => null
  },
  // Emoji người
  {
    id: 'person-old-man',
    name: 'Ông già',
    type: 'emoji',
    emoji: '👴',
    url: () => null
  },
  {
    id: 'person-woman',
    name: 'Cô gái',
    type: 'emoji',
    emoji: '👩',
    url: () => null
  },
  {
    id: 'person-man',
    name: 'Người đàn ông',
    type: 'emoji',
    emoji: '👨',
    url: () => null
  },
  {
    id: 'person-boy',
    name: 'Cậu bé',
    type: 'emoji',
    emoji: '👦',
    url: () => null
  },
  {
    id: 'person-girl',
    name: 'Cô bé',
    type: 'emoji',
    emoji: '👧',
    url: () => null
  },
  {
    id: 'person-old-woman',
    name: 'Bà già',
    type: 'emoji',
    emoji: '👵',
    url: () => null
  },
  {
    id: 'person-baby',
    name: 'Em bé',
    type: 'emoji',
    emoji: '👶',
    url: () => null
  },
  {
    id: 'person-student',
    name: 'Học sinh',
    type: 'emoji',
    emoji: '🧑‍🎓',
    url: () => null
  },
  {
    id: 'person-teacher',
    name: 'Giáo viên',
    type: 'emoji',
    emoji: '👨‍🏫',
    url: () => null
  },
  {
    id: 'person-judge',
    name: 'Thẩm phán',
    type: 'emoji',
    emoji: '👨‍⚖️',
    url: () => null
  },
  {
    id: 'person-doctor',
    name: 'Bác sĩ',
    type: 'emoji',
    emoji: '👨‍⚕️',
    url: () => null
  },
  {
    id: 'person-police',
    name: 'Cảnh sát',
    type: 'emoji',
    emoji: '👮',
    url: () => null
  },
  // Emoji mèo
  {
    id: 'cat-face',
    name: 'Mặt mèo',
    type: 'emoji',
    emoji: '🐱',
    url: () => null
  },
  {
    id: 'cat-grin',
    name: 'Mèo cười',
    type: 'emoji',
    emoji: '😸',
    url: () => null
  },
  {
    id: 'cat-heart',
    name: 'Mèo trái tim',
    type: 'emoji',
    emoji: '😻',
    url: () => null
  },
  {
    id: 'cat-smile',
    name: 'Mèo vui',
    type: 'emoji',
    emoji: '😺',
    url: () => null
  },
  {
    id: 'cat-wink',
    name: 'Mèo nháy mắt',
    type: 'emoji',
    emoji: '😼',
    url: () => null
  },
  {
    id: 'cat-kiss',
    name: 'Mèo hôn',
    type: 'emoji',
    emoji: '😽',
    url: () => null
  },
  {
    id: 'cat-crying',
    name: 'Mèo khóc',
    type: 'emoji',
    emoji: '😿',
    url: () => null
  },
  {
    id: 'cat-pouting',
    name: 'Mèo giận',
    type: 'emoji',
    emoji: '🙀',
    url: () => null
  },
  {
    id: 'cat-black',
    name: 'Mèo đen',
    type: 'emoji',
    emoji: '🐈‍⬛',
    url: () => null
  },
  {
    id: 'cat-orange',
    name: 'Mèo cam',
    type: 'emoji',
    emoji: '🐈',
    url: () => null
  }
]

// Tạo avatar URL từ preset ID
export function getAvatarUrl(presetId: string, name: string = 'User'): string | null {
  const preset = PRESET_AVATARS.find(a => a.id === presetId)
  if (!preset) {
    // Fallback to blue
    return PRESET_AVATARS[0].url(name)
  }
  
  // Nếu là emoji thì trả về null (sẽ render emoji trực tiếp)
  if (preset.type === 'emoji') {
    return null
  }
  
  return preset.url(name)
}

// Lấy emoji từ preset ID
export function getAvatarEmoji(presetId: string): string | null {
  const preset = PRESET_AVATARS.find(a => a.id === presetId)
  if (preset?.type === 'emoji' && preset.emoji) {
    return preset.emoji
  }
  return null
}

// Kiểm tra xem avatar URL có phải là preset không
export function isPresetAvatar(url: string | null): boolean {
  if (!url) return false
  return url.includes('ui-avatars.com')
}

// Kiểm tra xem preset có phải là emoji không
export function isEmojiAvatar(presetId: string): boolean {
  const preset = PRESET_AVATARS.find(a => a.id === presetId)
  return preset?.type === 'emoji'
}

// Lấy preset ID từ URL
export function getPresetIdFromUrl(url: string): string | null {
  if (!url.includes('ui-avatars.com')) return null
  
  // Extract background color from URL
  const match = url.match(/background=([^&]+)/)
  if (!match) return null
  
  const bgColor = match[1]
  
  // Map color to preset ID
  const colorMap: Record<string, string> = {
    '3b82f6': 'blue',
    '8b5cf6': 'purple',
    '10b981': 'green',
    'f59e0b': 'orange',
    'ef4444': 'red',
    'ec4899': 'pink',
    '6366f1': 'indigo',
    '14b8a6': 'teal',
    'eab308': 'yellow',
    '06b6d4': 'cyan',
    'f43f5e': 'rose'
  }
  
  return colorMap[bgColor] || 'blue'
}

