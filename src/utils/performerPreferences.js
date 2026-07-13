export function performerPreferenceKey(name) {
  const demoPrefix = typeof window !== 'undefined' && window.location.pathname.startsWith('/demo') ? 'demo_' : ''
  return `${demoPrefix}performer_${name}`
}
