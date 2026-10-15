package org.quantaphi.bubbles;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;

/** Exports a completed, locally recorded file to the owner's phone media library.
 * A private app path is NOT a Gallery recording. Keep it if publishing fails.
 * Android 10+ scoped storage needs no storage permission for media we create.
 */
final class CapturePublisher {
    private CapturePublisher() {}

    static Uri publish(Context context, File source, String type) throws IOException {
        if (source == null || !source.isFile() || source.length() == 0)
            throw new IOException("Recording file is missing or empty");
        if (Build.VERSION.SDK_INT < 29)
            throw new IOException("Shared media export requires Android 10 or newer");
        final String directory;
        final Uri collection;
        if (type.startsWith("video/")) {
            directory = Environment.DIRECTORY_MOVIES + "/Bubbles";
            collection = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
        } else if (type.startsWith("audio/")) {
            directory = Environment.DIRECTORY_MUSIC + "/Bubbles";
            collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        } else if (type.startsWith("image/")) {
            directory = Environment.DIRECTORY_PICTURES + "/Bubbles";
            collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        } else throw new IOException("Unsupported media type");

        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, source.getName());
        values.put(MediaStore.MediaColumns.MIME_TYPE, type);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, directory);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
        ContentResolver resolver = context.getContentResolver();
        Uri target = resolver.insert(collection, values);
        if (target == null) throw new IOException("Phone media library rejected the recording");
        try {
            try (FileInputStream input = new FileInputStream(source);
                 OutputStream output = resolver.openOutputStream(target, "w")) {
                if (output == null) throw new IOException("Could not open phone media destination");
                byte[] buffer = new byte[65536];
                int read;
                while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
                output.flush();
            }
            ContentValues ready = new ContentValues();
            ready.put(MediaStore.MediaColumns.IS_PENDING, 0);
            if (resolver.update(target, ready, null, null) < 1)
                throw new IOException("Could not finalize recording in phone library");
            return target;
        } catch (Exception error) {
            resolver.delete(target, null, null);
            if (error instanceof IOException) throw (IOException) error;
            throw new IOException("Media export failed: " + error.getClass().getSimpleName(), error);
        }
    }
}
