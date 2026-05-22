import { Platform } from 'react-native';

/**
 * On the Expo web build the on-screen keyboard is handled by the browser, not
 * by React Native. `KeyboardAvoidingView` is a no-op there, and a viewport-
 * sized centered form leaves no overflow for the browser to scroll. This
 * helper attaches a focus handler that scrolls the focused <input> into the
 * middle of the (already shrunk) visual viewport.
 *
 * On native platforms the returned handler is `undefined` so RN can keep
 * doing its own thing.
 */
export function useWebScrollIntoView() {
  if (Platform.OS !== 'web') return undefined;
  return (event: any) => {
    const target = event?.target;
    if (!target || typeof target.scrollIntoView !== 'function') return;
    // Defer until the virtual keyboard has actually resized the viewport,
    // otherwise the scroll happens against the old layout.
    setTimeout(() => {
      try {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch {
        target.scrollIntoView();
      }
    }, 300);
  };
}
