package org.quantaphi.bubbles;
public final class SimNetworkCommandsCheck {
 public static void main(String[] args) {
  for(String s:new String[]{"check my SIM","Bubbles, inspect the SIM card","show network status","check my internet connection"})
   if(!SimNetworkCommands.matches(s))throw new AssertionError("Missed explicit check: "+s);
  for(String s:new String[]{"don't check my SIM","change my SIM","activate free internet","read all phone data","explain how to check my SIM","check my sim and transfer money"})
   if(SimNetworkCommands.matches(s))throw new AssertionError("Overbroad action: "+s);
 }
}
