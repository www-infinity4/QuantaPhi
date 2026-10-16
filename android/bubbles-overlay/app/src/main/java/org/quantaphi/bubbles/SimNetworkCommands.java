package org.quantaphi.bubbles;

/** Explicit device-inspection intents only; observation does not provision service. */
final class SimNetworkCommands {
 private SimNetworkCommands() {}
 static boolean matches(String raw) {
  return raw != null && raw.trim().matches("(?i)^(?:(?:please|bubbles)[, ]+)*(?:check|inspect|show|read)(?: my| the)? (?:sim(?: card)?(?: status)?|cellular(?: connection)?|internet connection|network status)[.!?]*$");
 }
}
