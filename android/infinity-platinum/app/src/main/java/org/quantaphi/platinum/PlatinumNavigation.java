package org.quantaphi.platinum;
import java.net.URI;
import java.util.Locale;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/** URL parsing that never interprets script/data/file/intent input as websites. */
public final class PlatinumNavigation {
 public static final String START = "https://quantaphi.org/platinum/";
 private PlatinumNavigation(){}
 public static String web(String raw) {
  if(raw==null)return "";
  String input=raw.trim();
  if(input.isEmpty()||input.length()>2048||input.matches("(?s).*\\s+.*"))return "";
  if(!input.matches("(?i)^https?://.*")){
   if(input.matches("(?i)^[a-z][a-z0-9+.-]*:.*"))return "";
   if(!input.matches("(?i)^(?:[a-z0-9-]+\\.)+[a-z]{2,}(?::[0-9]{1,5})?(?:[/?#].*)?$"))return "";
   input="https://"+input;
  }
  try{
   URI url=new URI(input);
   String scheme=url.getScheme(),host=url.getHost();
   if(!("https".equalsIgnoreCase(scheme)||"http".equalsIgnoreCase(scheme))
     ||host==null||host.isBlank()||url.getRawUserInfo()!=null)return "";
   return url.toASCIIString();
  }catch(Exception e){return "";}
 }
 public static String openOrSearch(String raw) {
  String value=raw==null?"":raw.trim();
  String address=web(value);
  if(!address.isEmpty())return address;
  if(value.isEmpty()||value.length()>300||value.matches("(?i)^[a-z][a-z0-9+.-]*:.*"))return "";
  return "https://quantaphi.org/?q="+URLEncoder.encode(value,StandardCharsets.UTF_8);
 }
 public static boolean isPlatinum(String raw) {
  try{
   URI u=new URI(raw);return "https".equalsIgnoreCase(u.getScheme())&&"quantaphi.org".equalsIgnoreCase(u.getHost())
      &&(u.getPath().equals("/platinum/")||u.getPath().equals("/platinum/index.html"));
  }catch(Exception e){return false;}
 }
}
