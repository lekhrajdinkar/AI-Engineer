import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';

export const isNative = Capacitor.isNativePlatform();

export async function chooseImage(): Promise<string | undefined> {
  const photo = await Camera.getPhoto({
    source: CameraSource.Prompt,
    resultType: CameraResultType.Uri,
    quality: 85,
    width: 1600,
    correctOrientation: true,
  });
  return photo.webPath;
}

export async function shareReflection(text: string): Promise<void> {
  const title = 'A note from Daymark';
  if (isNative) {
    await Share.share({ title, text, dialogTitle: 'Share reflection' });
  } else if (navigator.share) {
    await navigator.share({ title, text });
  } else {
    await navigator.clipboard.writeText(text);
  }
}

const INTENTION_KEY = 'daymark.intention';

export async function loadIntention(): Promise<string> {
  const { value } = await Preferences.get({ key: INTENTION_KEY });
  return value ?? 'Move with intention, not urgency.';
}

export async function saveIntention(value: string): Promise<void> {
  await Preferences.set({ key: INTENTION_KEY, value });
}
