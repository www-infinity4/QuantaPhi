package org.quantaphi.bubbles;

import android.content.Context;
import android.graphics.*;
import android.media.MediaMetadataRetriever;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.io.File;
import java.util.concurrent.TimeUnit;

/** Local OCR only: reads visible text, never claims full video/scene understanding. */
final class CaptureReader {
    static String read(Context context, File file, String type) throws Exception {
        StringBuilder result = new StringBuilder("Extracted visible text (OCR; not full visual understanding):\n");
        TextRecognizer reader = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        MediaMetadataRetriever video = null;
        try {
            if (type.startsWith("video/")) {
                video = new MediaMetadataRetriever(); video.setDataSource(file.getAbsolutePath());
                long duration = Long.parseLong(video.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION));
                result.append("Video length: ").append(duration).append(" ms. Up to eight sampled frames; audio not transcribed from this video.\n");
                for (int i = 0; i < 8 && result.length() < 7000; i++) {
                    long time = duration * i / 8;
                    Bitmap bitmap = android.os.Build.VERSION.SDK_INT >= 27
                            ? video.getScaledFrameAtTime(time * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC, 720, 1280)
                            : video.getFrameAtTime(time * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
                    if (bitmap == null) continue;
                    try { result.append("At ").append(time).append(" ms: ").append(text(reader, bitmap)).append("\n"); }
                    finally { bitmap.recycle(); }
                }
            } else {
                BitmapFactory.Options bounds = new BitmapFactory.Options(); bounds.inJustDecodeBounds = true;
                BitmapFactory.decodeFile(file.getAbsolutePath(), bounds);
                BitmapFactory.Options options = new BitmapFactory.Options();
                int scale = 1; while (Math.max(bounds.outWidth, bounds.outHeight) / scale > 1600) scale *= 2;
                options.inSampleSize = scale;
                Bitmap bitmap = BitmapFactory.decodeFile(file.getAbsolutePath(), options);
                if (bitmap == null) throw new IllegalArgumentException("Image could not be decoded");
                try { result.append(text(reader, bitmap)); } finally { bitmap.recycle(); }
            }
            return result.substring(0, Math.min(7000, result.length()));
        } finally { reader.close(); if (video != null) video.release(); }
    }
    /** One user-requested Accessibility screenshot; no image is stored on disk. */
    static String readBitmap(Bitmap bitmap) throws Exception {
        TextRecognizer reader = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        try { return text(reader, bitmap); } finally { reader.close(); }
    }
    private static String text(TextRecognizer reader, Bitmap bitmap) throws Exception {
        String value = Tasks.await(reader.process(InputImage.fromBitmap(bitmap, 0)), 20, TimeUnit.SECONDS).getText();
        return value.isEmpty() ? "[No readable text found]" : value;
    }
}
