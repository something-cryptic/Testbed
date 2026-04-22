import { useState, useEffect, useRef } from 'react'
import { Lock } from 'lucide-react'
import axios from 'axios'
import { glassCard, glassButton, transparent } from '../styles/glass.ts'
import { themes } from '../styles/themes.ts'
import { useTheme } from '../context/ThemeContext.tsx'
import { useBreakpoint } from '../hooks/useBreakpoint.ts'

interface Props {
  userId: string
}

interface Preferences {
  theme: string
  sidebarCollapsed: boolean
  defaultPlatform: 'youtube' | 'instagram' | 'all'
  emailNotifications: boolean
  showSubscriberCount: boolean
}

const DEFAULT_PREFS: Preferences = {
  theme: 'lavender',
  sidebarCollapsed: false,
  defaultPlatform: 'all',
  emailNotifications: false,
  showSubscriberCount: true,
}

interface UserData {
  googleName: string | null
  email: string | null
  googleAvatarUrl: string | null
  username: string | null
  customAvatarUrl: string | null
  preferences: Preferences | null
}

// ── Inline components ─────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        background: on ? 'rgba(150, 120, 255, 0.5)' : 'rgba(200, 180, 255, 0.15)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 0.2s ease',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: on ? '23px' : '3px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'white',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  )
}

function SaveFeedback({ status, error }: { status: 'idle' | 'saving' | 'saved' | 'error'; error?: string }) {
  if (status === 'idle') return null
  if (status === 'saving') return <span style={{ fontSize: '13px', color: 'rgba(200, 185, 235, 0.6)' }}>Saving…</span>
  if (status === 'saved') return <span style={{ fontSize: '13px', color: 'rgba(134, 239, 172, 0.9)' }}>✓ Saved</span>
  return <span style={{ fontSize: '13px', color: 'rgba(255, 150, 150, 0.9)' }}>{error ?? 'Something went wrong'}</span>
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(200, 185, 235, 0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
      {children}
    </h2>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(200, 180, 255, 0.2)',
  borderRadius: '10px',
  color: 'white',
  padding: '10px 14px',
  fontSize: '14px',
  outline: 'none',
}

const readOnlyStyle: React.CSSProperties = {
  ...inputStyle,
  color: 'rgba(200, 185, 235, 0.45)',
  cursor: 'default',
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Profile({ userId }: Props) {
  const { setTheme } = useTheme()
  const { isMobile } = useBreakpoint()
  const [data, setData] = useState<UserData | null>(null)

  // Section 1 — avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [avatarError, setAvatarError] = useState('')
  const avatarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  // Section 2 — account info
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [accountStatus, setAccountStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [accountError, setAccountError] = useState('')
  const accountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Section 3 — preferences
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
  const [prefsStatus, setPrefsStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [prefsError, setPrefsError] = useState('')
  const prefsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    axios.get(`/users/${userId}/profile`).then(({ data: d }) => {
      const profile = d as UserData & Record<string, unknown>
      setData(profile)
      setUsername(profile.username ?? '')
      setPrefs({ ...DEFAULT_PREFS, ...(profile.preferences ?? {}) })
    }).catch(() => {})

    return () => {
      if (avatarTimerRef.current) clearTimeout(avatarTimerRef.current)
      if (accountTimerRef.current) clearTimeout(accountTimerRef.current)
      if (prefsTimerRef.current) clearTimeout(prefsTimerRef.current)
      // Revoke object URL to avoid memory leak
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [userId])

  function scheduleReset(setter: (s: 'idle') => void, ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
    if (ref.current) clearTimeout(ref.current)
    ref.current = setTimeout(() => setter('idle'), 2000)
  }

  // ── File selection ──────────────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!e.target) return
    // Reset input so the same file can be re-selected if needed
    ;(e.target as HTMLInputElement).value = ''

    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setAvatarStatus('error')
      setAvatarError('Image must be under 5MB')
      return
    }

    // Revoke previous preview URL
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    const objectUrl = URL.createObjectURL(file)
    previewUrlRef.current = objectUrl

    setPendingFile(file)
    setLocalPreview(objectUrl)
    setAvatarStatus('idle')
    setAvatarError('')
    setUploadProgress(0)
  }

  function cancelUpload() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPendingFile(null)
    setLocalPreview(null)
    setAvatarStatus('idle')
    setAvatarError('')
    setUploadProgress(0)
  }

  // ── Upload confirm ──────────────────────────────────────────────────────────
  async function confirmUpload() {
    if (!pendingFile) return
    setAvatarStatus('saving')
    setAvatarError('')
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('avatar', pendingFile)

    try {
      const { data: result } = await axios.post<{ avatarUrl: string }>(
        `/upload/avatar/${userId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress(evt) {
            if (evt.total) {
              setUploadProgress(Math.round((evt.loaded / evt.total) * 100))
            }
          },
        },
      )

      setData((d) => d ? { ...d, customAvatarUrl: result.avatarUrl } : d)
      setAvatarStatus('saved')
      // Revoke the object URL — we now use the server URL
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
      setPendingFile(null)
      setLocalPreview(null)
      setUploadProgress(0)
      scheduleReset(setAvatarStatus, avatarTimerRef)
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && typeof err.response?.data === 'object' && err.response?.data !== null
          ? ((err.response.data as Record<string, unknown>)['error'] as string | undefined) ?? 'Upload failed, please try again'
          : 'Upload failed, please try again'
      setAvatarStatus('error')
      setAvatarError(msg)
      setUploadProgress(0)
    }
  }

  // ── Remove custom avatar ────────────────────────────────────────────────────
  async function removeCustomAvatar() {
    setAvatarStatus('saving')
    try {
      await axios.put(`/users/${userId}/profile`, { customAvatarUrl: null })
      setData((d) => d ? { ...d, customAvatarUrl: null } : d)
      setAvatarStatus('saved')
      cancelUpload()
      scheduleReset(setAvatarStatus, avatarTimerRef)
    } catch {
      setAvatarStatus('error')
      setAvatarError('Failed to remove')
    }
  }

  // ── Account save ────────────────────────────────────────────────────────────
  function validateUsername(u: string): string {
    if (u.length > 32) return 'Username must be 32 characters or fewer'
    if (u.length > 0 && !/^[a-zA-Z0-9_]+$/.test(u)) return 'Only letters, numbers, and underscores allowed'
    return ''
  }

  async function saveAccount() {
    const err = validateUsername(username)
    if (err) { setUsernameError(err); return }
    setAccountStatus('saving')
    try {
      await axios.put(`/users/${userId}/profile`, { username: username.trim() || null })
      setData((d) => d ? { ...d, username: username.trim() || null } : d)
      setAccountStatus('saved')
      scheduleReset(setAccountStatus, accountTimerRef)
    } catch {
      setAccountStatus('error')
      setAccountError('Failed to save')
    }
  }

  // ── Preferences save ────────────────────────────────────────────────────────
  async function savePrefs() {
    setPrefsStatus('saving')
    try {
      await axios.put(`/users/${userId}/profile`, { preferences: prefs })
      setPrefsStatus('saved')
      scheduleReset(setPrefsStatus, prefsTimerRef)
    } catch {
      setPrefsStatus('error')
      setPrefsError('Failed to save')
    }
  }

  function handleThemeChange(themeId: string) {
    setPrefs((p) => ({ ...p, theme: themeId }))
    setTheme(themeId)
    localStorage.setItem('theme', themeId)
  }

  // The displayed avatar: local preview > server custom > google
  const currentAvatar = data?.customAvatarUrl ?? data?.googleAvatarUrl ?? null
  const displayAvatar = localPreview ?? currentAvatar

  return (
    <div
      style={{
        ...transparent,
        maxWidth: '640px',
        margin: '0 auto',
        padding: isMobile ? '16px' : '40px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* ── Section 1: Profile Picture ── */}
      <section style={transparent}>
        <SectionHeading>Profile Picture</SectionHeading>
        <div style={{ ...glassCard, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
            {/* Avatar circle — clickable to open file picker */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, borderRadius: '50%' }}
              title="Click to change photo"
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Profile"
                  style={{
                    width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover',
                    boxShadow: '0 0 0 3px rgba(200, 185, 235, 0.15), 0 4px 16px rgba(0,0,0,0.3)',
                    display: 'block',
                  }}
                  onError={() => setLocalPreview(null)}
                />
              ) : (
                <div
                  style={{
                    width: '96px', height: '96px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a78bfa, #818cf8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '36px', fontWeight: 700, color: 'white',
                    boxShadow: '0 0 0 3px rgba(200, 185, 235, 0.15), 0 4px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  {(data?.googleName ?? data?.email ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="glow-hover"
                style={{ ...glassButton, padding: '8px 16px', fontSize: '13px' }}
              >
                Change Photo
              </button>
              {data?.customAvatarUrl && !pendingFile && (
                <button
                  onClick={removeCustomAvatar}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'rgba(255, 150, 150, 0.8)', textAlign: 'left', padding: 0 }}
                >
                  Remove custom photo
                </button>
              )}
              <SaveFeedback status={avatarStatus} error={avatarError} />
            </div>
          </div>

          {/* Upload progress bar */}
          {avatarStatus === 'saving' && (
            <div style={{ width: '100%', background: 'rgba(200, 180, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '3px',
                  width: `${uploadProgress}%`,
                  background: 'rgba(200, 180, 255, 0.8)',
                  borderRadius: '2px',
                  transition: 'width 0.15s ease',
                }}
              />
            </div>
          )}

          {/* Pending file confirmation */}
          {pendingFile && avatarStatus !== 'saving' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(200, 185, 235, 0.5)' }}>
                {pendingFile.name} — {(pendingFile.size / 1024).toFixed(0)} KB
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={confirmUpload}
                  className="glow-hover"
                  style={{ ...glassButton, padding: '8px 18px', fontSize: '13px' }}
                >
                  Upload Photo
                </button>
                <button
                  onClick={cancelUpload}
                  style={{
                    padding: '8px 18px',
                    fontSize: '13px',
                    background: 'transparent',
                    border: '1px solid rgba(200, 180, 255, 0.2)',
                    borderRadius: '10px',
                    color: 'rgba(200, 185, 235, 0.6)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 2: Account Info ── */}
      <section style={transparent}>
        <SectionHeading>Account Info</SectionHeading>
        <div style={{ ...glassCard, padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Username */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label style={{ fontSize: '13px', color: 'rgba(200, 185, 235, 0.7)', fontWeight: 500 }}>Username</label>
              <span style={{ fontSize: '11px', color: 'rgba(200, 185, 235, 0.35)' }}>{username.length}/32</span>
            </div>
            <input
              type="text"
              value={username}
              maxLength={32}
              placeholder={data?.googleName ?? 'Your username'}
              onChange={(e) => { setUsername(e.target.value); setUsernameError(validateUsername(e.target.value)) }}
              style={inputStyle}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200, 180, 255, 0.5)' }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200, 180, 255, 0.2)' }}
            />
            {usernameError && <p style={{ fontSize: '12px', color: 'rgba(255, 150, 150, 0.85)' }}>{usernameError}</p>}
          </div>

          {/* Display Name (read only) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: 'rgba(200, 185, 235, 0.7)', fontWeight: 500 }}>Display Name</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={11} color="rgba(200, 185, 235, 0.35)" />
                <span style={{ fontSize: '11px', color: 'rgba(200, 185, 235, 0.35)' }}>Managed by Google</span>
              </div>
            </div>
            <input type="text" value={data?.googleName ?? ''} readOnly style={readOnlyStyle} />
          </div>

          {/* Email (read only) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: 'rgba(200, 185, 235, 0.7)', fontWeight: 500 }}>Email</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={11} color="rgba(200, 185, 235, 0.35)" />
                <span style={{ fontSize: '11px', color: 'rgba(200, 185, 235, 0.35)' }}>Managed by Google</span>
              </div>
            </div>
            <input type="email" value={data?.email ?? ''} readOnly style={readOnlyStyle} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
            <button
              onClick={saveAccount}
              disabled={accountStatus === 'saving' || !!usernameError}
              className="glow-hover"
              style={{
                ...glassButton, padding: '9px 20px', fontSize: '14px',
                opacity: (accountStatus === 'saving' || !!usernameError) ? 0.6 : 1,
                cursor: (accountStatus === 'saving' || !!usernameError) ? 'not-allowed' : 'pointer',
                width: isMobile ? '100%' : undefined,
              }}
            >
              Save
            </button>
            <SaveFeedback status={accountStatus} error={accountError} />
          </div>
        </div>
      </section>

      {/* ── Section 3: Site Preferences ── */}
      <section style={transparent}>
        <SectionHeading>Site Preferences</SectionHeading>
        <div style={{ ...glassCard, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Theme */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '13px', color: 'rgba(200, 185, 235, 0.7)', fontWeight: 500 }}>Color Theme</label>
              <span style={{ fontSize: '11px', color: 'rgba(200, 185, 235, 0.35)' }}>Theme applies instantly</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(5, 1fr)', gap: '8px' }}>
              {Object.values(themes).map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  title={t.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 6px',
                    borderRadius: '10px',
                    background: prefs.theme === t.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                    border: prefs.theme === t.id
                      ? `2px solid ${t.accentColor}`
                      : '2px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: t.accentColor,
                      boxShadow: prefs.theme === t.id ? `0 0 8px ${t.accentColor}` : 'none',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{
                    fontSize: '11px',
                    color: prefs.theme === t.id ? 'rgba(255,255,255,0.9)' : 'rgba(200,185,235,0.5)',
                    fontWeight: prefs.theme === t.id ? 600 : 400,
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Default Platform */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'rgba(200, 185, 235, 0.7)', fontWeight: 500 }}>Default Analysis Platform</label>
            <select
              value={prefs.defaultPlatform}
              onChange={(e) => setPrefs((p) => ({ ...p, defaultPlatform: e.target.value as Preferences['defaultPlatform'] }))}
              style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'rgba(200, 180, 255, 0.5)' }}
              onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'rgba(200, 180, 255, 0.2)' }}
            >
              <option value="all" style={{ background: '#1e1a35' }}>All Platforms</option>
              <option value="youtube" style={{ background: '#1e1a35' }}>YouTube</option>
              <option value="instagram" style={{ background: '#1e1a35' }}>Instagram</option>
            </select>
            <p style={{ fontSize: '11px', color: 'rgba(200, 185, 235, 0.35)' }}>Which platform to analyze by default</p>
          </div>

          {/* Show Subscriber Count */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <p style={{ fontSize: '14px', color: 'rgba(225, 215, 255, 0.85)', fontWeight: 500 }}>
              Show subscriber counts on dashboard
            </p>
            <Toggle on={prefs.showSubscriberCount} onChange={(v) => setPrefs((p) => ({ ...p, showSubscriberCount: v }))} />
          </div>

          {/* Email Notifications */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'rgba(225, 215, 255, 0.85)', fontWeight: 500 }}>Email notifications</p>
              <p style={{ fontSize: '12px', color: 'rgba(200, 185, 235, 0.45)', marginTop: '2px' }}>Get notified when analysis completes</p>
            </div>
            <Toggle on={prefs.emailNotifications} onChange={(v) => setPrefs((p) => ({ ...p, emailNotifications: v }))} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
            <button
              onClick={savePrefs}
              disabled={prefsStatus === 'saving'}
              className="glow-hover"
              style={{
                ...glassButton, padding: '9px 20px', fontSize: '14px',
                opacity: prefsStatus === 'saving' ? 0.6 : 1,
                cursor: prefsStatus === 'saving' ? 'not-allowed' : 'pointer',
                width: isMobile ? '100%' : undefined,
              }}
            >
              Save Preferences
            </button>
            <SaveFeedback status={prefsStatus} error={prefsError} />
          </div>
        </div>
      </section>
    </div>
  )
}
