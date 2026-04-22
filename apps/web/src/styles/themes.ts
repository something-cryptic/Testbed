export interface Theme {
  id: string
  label: string
  background: string
  backgroundGradient: string
  glowColor: string
  glowColorStrong: string
  borderAccent: string
  borderAccentStrong: string
  borderSubtle: string
  glassBase: string
  glassMedium: string
  glassStrong: string
  buttonBase: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  accentColor: string
}

export const themes: Record<string, Theme> = {

  lavender: {
    id: 'lavender',
    label: 'Lavender',
    background: 'linear-gradient(135deg, #0e0e1a 0%, #13112b 40%, #110f24 100%)',
    backgroundGradient: 'radial-gradient(ellipse 80% 80% at 100% 100%, rgba(180,160,255,0.25) 0%, rgba(140,120,220,0.1) 40%, transparent 70%)',
    glowColor: 'rgba(190, 168, 255, 0.18)',
    glowColorStrong: 'rgba(200, 180, 255, 0.3)',
    borderAccent: 'rgba(210, 190, 255, 0.35)',
    borderAccentStrong: 'rgba(210, 190, 255, 0.5)',
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    glassBase: 'rgba(235, 228, 255, 0.07)',
    glassMedium: 'rgba(225, 215, 255, 0.05)',
    glassStrong: 'rgba(28, 22, 50, 0.92)',
    buttonBase: 'rgba(200, 180, 255, 0.18)',
    textPrimary: 'rgba(255, 255, 255, 0.95)',
    textSecondary: 'rgba(210, 200, 255, 0.75)',
    textMuted: 'rgba(180, 170, 220, 0.5)',
    accentColor: '#c4b0ff',
  },

  midnight: {
    id: 'midnight',
    label: 'Midnight',
    background: 'linear-gradient(135deg, #000000 0%, #080c14 40%, #060810 100%)',
    backgroundGradient: 'radial-gradient(ellipse 80% 80% at 100% 100%, rgba(50,100,200,0.2) 0%, rgba(30,60,140,0.08) 40%, transparent 70%)',
    glowColor: 'rgba(60, 120, 255, 0.15)',
    glowColorStrong: 'rgba(80, 140, 255, 0.25)',
    borderAccent: 'rgba(80, 140, 255, 0.3)',
    borderAccentStrong: 'rgba(80, 140, 255, 0.5)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    glassBase: 'rgba(20, 40, 80, 0.15)',
    glassMedium: 'rgba(15, 30, 60, 0.12)',
    glassStrong: 'rgba(5, 10, 25, 0.95)',
    buttonBase: 'rgba(60, 120, 255, 0.2)',
    textPrimary: 'rgba(220, 235, 255, 0.95)',
    textSecondary: 'rgba(160, 190, 240, 0.75)',
    textMuted: 'rgba(100, 140, 200, 0.5)',
    accentColor: '#4d8fff',
  },

  aurora: {
    id: 'aurora',
    label: 'Aurora',
    background: 'linear-gradient(135deg, #020d0a 0%, #051a12 40%, #040e0c 100%)',
    backgroundGradient: 'radial-gradient(ellipse 80% 80% at 100% 100%, rgba(0,200,120,0.2) 0%, rgba(0,150,100,0.08) 40%, transparent 70%)',
    glowColor: 'rgba(0, 210, 130, 0.15)',
    glowColorStrong: 'rgba(0, 230, 150, 0.25)',
    borderAccent: 'rgba(0, 210, 130, 0.3)',
    borderAccentStrong: 'rgba(0, 230, 150, 0.5)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    glassBase: 'rgba(0, 60, 40, 0.15)',
    glassMedium: 'rgba(0, 45, 30, 0.12)',
    glassStrong: 'rgba(2, 15, 10, 0.95)',
    buttonBase: 'rgba(0, 180, 110, 0.2)',
    textPrimary: 'rgba(220, 255, 240, 0.95)',
    textSecondary: 'rgba(140, 220, 180, 0.75)',
    textMuted: 'rgba(80, 160, 120, 0.5)',
    accentColor: '#00d282',
  },

  rose: {
    id: 'rose',
    label: 'Rose',
    background: 'linear-gradient(135deg, #150508 0%, #200a10 40%, #180608 100%)',
    backgroundGradient: 'radial-gradient(ellipse 80% 80% at 100% 100%, rgba(220,60,100,0.22) 0%, rgba(180,40,80,0.08) 40%, transparent 70%)',
    glowColor: 'rgba(230, 80, 120, 0.15)',
    glowColorStrong: 'rgba(240, 100, 140, 0.28)',
    borderAccent: 'rgba(230, 80, 120, 0.35)',
    borderAccentStrong: 'rgba(240, 100, 140, 0.5)',
    borderSubtle: 'rgba(255, 255, 255, 0.05)',
    glassBase: 'rgba(80, 20, 35, 0.15)',
    glassMedium: 'rgba(60, 15, 25, 0.12)',
    glassStrong: 'rgba(20, 5, 10, 0.95)',
    buttonBase: 'rgba(220, 60, 100, 0.22)',
    textPrimary: 'rgba(255, 230, 235, 0.95)',
    textSecondary: 'rgba(240, 170, 185, 0.75)',
    textMuted: 'rgba(200, 120, 140, 0.5)',
    accentColor: '#e85080',
  },

  slate: {
    id: 'slate',
    label: 'Slate',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #111114 40%, #0d0d10 100%)',
    backgroundGradient: 'radial-gradient(ellipse 80% 80% at 100% 100%, rgba(160,160,180,0.15) 0%, rgba(120,120,140,0.06) 40%, transparent 70%)',
    glowColor: 'rgba(180, 180, 200, 0.12)',
    glowColorStrong: 'rgba(200, 200, 220, 0.22)',
    borderAccent: 'rgba(180, 180, 210, 0.28)',
    borderAccentStrong: 'rgba(200, 200, 230, 0.45)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    glassBase: 'rgba(60, 60, 75, 0.12)',
    glassMedium: 'rgba(45, 45, 58, 0.1)',
    glassStrong: 'rgba(12, 12, 16, 0.95)',
    buttonBase: 'rgba(150, 150, 180, 0.18)',
    textPrimary: 'rgba(240, 240, 250, 0.95)',
    textSecondary: 'rgba(180, 180, 200, 0.75)',
    textMuted: 'rgba(120, 120, 145, 0.5)',
    accentColor: '#a0a0c8',
  },

  ocean: {
    id: 'ocean',
    label: 'Ocean',
    background: 'linear-gradient(135deg, #020810 0%, #041020 40%, #030c18 100%)',
    backgroundGradient: 'radial-gradient(ellipse 80% 80% at 100% 100%, rgba(0,160,200,0.22) 0%, rgba(0,120,170,0.08) 40%, transparent 70%)',
    glowColor: 'rgba(0, 180, 220, 0.15)',
    glowColorStrong: 'rgba(0, 200, 240, 0.28)',
    borderAccent: 'rgba(0, 180, 220, 0.32)',
    borderAccentStrong: 'rgba(0, 210, 250, 0.5)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    glassBase: 'rgba(0, 40, 70, 0.15)',
    glassMedium: 'rgba(0, 30, 55, 0.12)',
    glassStrong: 'rgba(2, 10, 20, 0.95)',
    buttonBase: 'rgba(0, 160, 200, 0.2)',
    textPrimary: 'rgba(220, 245, 255, 0.95)',
    textSecondary: 'rgba(120, 210, 240, 0.75)',
    textMuted: 'rgba(60, 150, 190, 0.5)',
    accentColor: '#00b4dc',
  },

  ember: {
    id: 'ember',
    label: 'Ember',
    background: 'linear-gradient(135deg, #100800 0%, #1a0e00 40%, #140a00 100%)',
    backgroundGradient: 'radial-gradient(ellipse 80% 80% at 100% 100%, rgba(220,120,0,0.22) 0%, rgba(180,80,0,0.08) 40%, transparent 70%)',
    glowColor: 'rgba(230, 130, 0, 0.15)',
    glowColorStrong: 'rgba(250, 150, 20, 0.28)',
    borderAccent: 'rgba(230, 130, 0, 0.35)',
    borderAccentStrong: 'rgba(250, 150, 20, 0.5)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    glassBase: 'rgba(80, 35, 0, 0.15)',
    glassMedium: 'rgba(60, 25, 0, 0.12)',
    glassStrong: 'rgba(18, 8, 0, 0.95)',
    buttonBase: 'rgba(220, 120, 0, 0.22)',
    textPrimary: 'rgba(255, 240, 215, 0.95)',
    textSecondary: 'rgba(240, 190, 120, 0.75)',
    textMuted: 'rgba(190, 130, 60, 0.5)',
    accentColor: '#e68200',
  },

  arctic: {
    id: 'arctic',
    label: 'Arctic',
    background: 'linear-gradient(135deg, #e8eef5 0%, #dde6f0 40%, #e2eaf4 100%)',
    backgroundGradient: 'radial-gradient(ellipse 80% 80% at 100% 100%, rgba(100,160,220,0.2) 0%, rgba(80,140,200,0.08) 40%, transparent 70%)',
    glowColor: 'rgba(100, 160, 220, 0.2)',
    glowColorStrong: 'rgba(120, 180, 240, 0.35)',
    borderAccent: 'rgba(100, 160, 220, 0.3)',
    borderAccentStrong: 'rgba(120, 180, 240, 0.5)',
    borderSubtle: 'rgba(0, 0, 0, 0.06)',
    glassBase: 'rgba(255, 255, 255, 0.45)',
    glassMedium: 'rgba(255, 255, 255, 0.35)',
    glassStrong: 'rgba(240, 245, 255, 0.96)',
    buttonBase: 'rgba(100, 160, 220, 0.2)',
    textPrimary: 'rgba(15, 30, 60, 0.95)',
    textSecondary: 'rgba(30, 60, 110, 0.8)',
    textMuted: 'rgba(60, 90, 140, 0.6)',
    accentColor: '#4a90d9',
  },

  forest: {
    id: 'forest',
    label: 'Forest',
    background: 'linear-gradient(135deg, #040a04 0%, #081408 40%, #060e06 100%)',
    backgroundGradient: 'radial-gradient(ellipse 80% 80% at 100% 100%, rgba(60,160,60,0.2) 0%, rgba(40,120,40,0.08) 40%, transparent 70%)',
    glowColor: 'rgba(70, 180, 70, 0.15)',
    glowColorStrong: 'rgba(90, 200, 90, 0.25)',
    borderAccent: 'rgba(70, 180, 70, 0.3)',
    borderAccentStrong: 'rgba(90, 200, 90, 0.5)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    glassBase: 'rgba(20, 55, 20, 0.15)',
    glassMedium: 'rgba(15, 40, 15, 0.12)',
    glassStrong: 'rgba(4, 12, 4, 0.95)',
    buttonBase: 'rgba(60, 160, 60, 0.2)',
    textPrimary: 'rgba(220, 245, 220, 0.95)',
    textSecondary: 'rgba(140, 210, 140, 0.75)',
    textMuted: 'rgba(80, 150, 80, 0.5)',
    accentColor: '#46b446',
  },

  gold: {
    id: 'gold',
    label: 'Gold',
    background: 'linear-gradient(135deg, #0c0900 0%, #161000 40%, #100d00 100%)',
    backgroundGradient: 'radial-gradient(ellipse 80% 80% at 100% 100%, rgba(200,160,0,0.22) 0%, rgba(160,120,0,0.08) 40%, transparent 70%)',
    glowColor: 'rgba(210, 170, 0, 0.15)',
    glowColorStrong: 'rgba(230, 190, 20, 0.28)',
    borderAccent: 'rgba(210, 170, 0, 0.35)',
    borderAccentStrong: 'rgba(230, 190, 20, 0.5)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    glassBase: 'rgba(70, 50, 0, 0.15)',
    glassMedium: 'rgba(50, 35, 0, 0.12)',
    glassStrong: 'rgba(14, 10, 0, 0.95)',
    buttonBase: 'rgba(200, 160, 0, 0.22)',
    textPrimary: 'rgba(255, 245, 210, 0.95)',
    textSecondary: 'rgba(240, 210, 120, 0.75)',
    textMuted: 'rgba(190, 155, 60, 0.5)',
    accentColor: '#d4a800',
  },
}

export const defaultTheme = themes['lavender']!
