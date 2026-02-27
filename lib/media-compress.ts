import { Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

/**
 * Compress an image before upload.
 * - Resizes to max 1080px on the longest side
 * - Compresses to 80% quality JPEG
 * Returns the compressed URI (or original if web/error)
 */
export async function compressImage(uri: string): Promise<string> {
  if (Platform.OS === "web") return uri;
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch (e) {
    console.warn("Image compression failed, using original:", e);
    return uri;
  }
}

/**
 * Compress a profile photo (smaller, square-friendly)
 * - Resizes to max 512px
 * - Compresses to 85% quality
 */
export async function compressProfilePhoto(uri: string): Promise<string> {
  if (Platform.OS === "web") return uri;
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 512 } }],
      {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch (e) {
    console.warn("Profile photo compression failed, using original:", e);
    return uri;
  }
}

/**
 * Compress a team logo (small, square)
 * - Resizes to max 256px
 * - Compresses to 90% quality
 */
export async function compressTeamLogo(uri: string): Promise<string> {
  if (Platform.OS === "web") return uri;
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 256 } }],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch (e) {
    console.warn("Team logo compression failed, using original:", e);
    return uri;
  }
}
