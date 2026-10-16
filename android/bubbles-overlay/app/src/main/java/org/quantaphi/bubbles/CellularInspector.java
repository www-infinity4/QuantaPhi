package org.quantaphi.bubbles;

import android.content.Context;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.telephony.TelephonyManager;
import java.util.Locale;

/**
 * Locally inspected, NON-IDENTIFYING Android cellular capabilities.
 * Never requests ICCID, IMSI, phone number, IMEI, SIM secrets, location,
 * root, baseband modifications, or hidden telephony API privileges.
 * Reports the *current* transport, not all baseband-supported bands.
 */
public final class CellularInspector {
 private CellularInspector() {}

 /** Public known carrier model specifications are reference data, not live RF probes. */
 public static String publishedBands(String model) {
  String s=model==null?"":model.toUpperCase(Locale.ROOT).trim();
  if(s.contains("XT2163-4"))return "Published XT2163-4 LTE bands: 1, 2, 3, 4, 5, 7, 8, 12, 13, 17, 25, 26, 38, 40, 41, 66, 71. Band 48 is not listed.";
  if(s.contains("XT2163-6"))return "Published AT&T XT2163-6 LTE bands: 2, 4, 5, 12, 14, 30, 66. Band 48 is not listed.";
  if(s.toLowerCase(Locale.ROOT).contains("moto g pure")||s.startsWith("XT2163"))
   return "Moto G Pure detected. Variant-specific band list needs the XT2163 suffix. Published variants do not list Band 48.";
  return "Verify the manufacturer's exact LTE bands for this hardware model; no band support inferred.";
 }

 public static String capture(Context context){
  StringBuilder b=new StringBuilder();
  b.append("Hardware: ").append(Build.MANUFACTURER).append(" ").append(Build.MODEL).append("\n");
  b.append("Android: ").append(Build.VERSION.RELEASE).append("\n");
  b.append(publishedBands(Build.MODEL)).append("\n\n");
  boolean telephony=context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY);
  b.append("Cellular radio feature: ").append(telephony?"present":"not reported").append("\n");
  TelephonyManager tm=(TelephonyManager)context.getSystemService(Context.TELEPHONY_SERVICE);
  if(telephony && tm!=null){
   try{b.append("SIM card installed: ").append(tm.hasIccCard()?"yes":"no").append("\n");}
   catch(SecurityException|UnsupportedOperationException e){b.append("SIM card: Android restricted access\n");}
   try{String name=tm.getSimOperatorName();
    b.append("Current SIM network name: ").append(name==null||name.isBlank()?"not reported":name).append("\n");
   }catch(SecurityException|UnsupportedOperationException e){b.append("SIM network name: not available\n");}
   try{b.append("Infinity app has carrier privileges for this SIM: ").append(tm.hasCarrierPrivileges()?"yes":"no").append("\n");}
   catch(SecurityException|UnsupportedOperationException e){b.append("SIM administrative permissions: unavailable\n");}
  }
  b.append("Current IP connection: ");
  try{
   ConnectivityManager cm=(ConnectivityManager)context.getSystemService(Context.CONNECTIVITY_SERVICE);
   Network net=cm==null?null:cm.getActiveNetwork();
   NetworkCapabilities nc=net==null?null:cm.getNetworkCapabilities(net);
   if(nc==null)b.append("not available");
   else {
    if(nc.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR))b.append("cellular");
    else if(nc.hasTransport(NetworkCapabilities.TRANSPORT_WIFI))b.append("Wi-Fi");
    else if(nc.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET))b.append("Ethernet");
    else b.append("another transport");
    b.append(nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)?" (Android validated Internet)":" (Internet not independently validated)");
   }
  }catch(SecurityException|UnsupportedOperationException e){b.append("Android did not provide transport details");}
  b.append("\n\nThis inspection does not activate cellular service or free carrier data. Infinity needs an authorized carrier or Wi-Fi connection. A network name alone is not proof of internet access.\n");
  b.append("No SIM identifier, phone number, location, or password is read or transmitted. These device details remain local to this inspection.");
  return b.toString();
 }
}
