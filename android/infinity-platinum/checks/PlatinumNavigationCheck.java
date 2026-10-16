package org.quantaphi.platinum;
public final class PlatinumNavigationCheck {
 public static void main(String[] args) {
  if(!"https://example.com".equals(PlatinumNavigation.web("example.com")))throw new AssertionError("hostname");
  if(!"https://example.org/notes#read".equals(PlatinumNavigation.web("https://example.org/notes#read")))throw new AssertionError("url");
  for(String bad:new String[]{"javascript:alert(1)","data:text/html,1","file:///sdcard/secret","intent://bank","https://alice:password@example.com","one two","http://example.com/evil\nheader"})
   if(!PlatinumNavigation.web(bad).isEmpty())throw new AssertionError("unsafe URL: "+bad);
  if(!PlatinumNavigation.openOrSearch("platinum elements").contains("?q=platinum+elements"))throw new AssertionError("search");
  if(!PlatinumNavigation.openOrSearch("641-555-0198").startsWith("https://quantaphi.org/phone/?dial="))throw new AssertionError("private number dialer");
  if(!"https://quantaphi.org/".equals(PlatinumNavigation.openOrSearch("4-333-3333#")))throw new AssertionError("Infinity local access code");
  if(!"https://quantaphi.org/".equals(PlatinumNavigation.openOrSearch("4 333 3333 #")))throw new AssertionError("Infinity spaced code");
  if("https://quantaphi.org/".equals(PlatinumNavigation.openOrSearch("4-333-3333")))throw new AssertionError("Never intercept ordinary phone digits");
  if(!PlatinumNavigation.isPlatinum("https://quantaphi.org/platinum/"))throw new AssertionError("first party");
  if(PlatinumNavigation.isPlatinum("https://evil.example/platinum/"))throw new AssertionError("forged first party");
  System.out.println("PlatinumNavigation checks passed");
 }
}
