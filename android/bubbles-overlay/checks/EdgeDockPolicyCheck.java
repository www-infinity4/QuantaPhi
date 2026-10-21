package org.quantaphi.bubbles;
public final class EdgeDockPolicyCheck {
    static void check(boolean condition,String message){if(!condition)throw new AssertionError(message);}
    public static void main(String[] args){
        check(EdgeDockPolicy.edgeX(false,1080,180)==-45,"left quarter dock");
        check(EdgeDockPolicy.edgeX(true,1080,180)==945,"right quarter dock");
        check(EdgeDockPolicy.dragX(-100,1080,180)==-45,"left clamp");
        check(EdgeDockPolicy.dragX(2000,1080,180)==945,"right clamp");
        check(EdgeDockPolicy.y(-30,2000,180)==0,"top clamp");
        check(EdgeDockPolicy.y(1950,2000,180)==1820,"bottom clamp");
        check(EdgeDockPolicy.dockRight(720,1080,180),"right docking");
        check(!EdgeDockPolicy.dockRight(0,1080,180),"left docking");
        System.out.println("Bubbles edge docking geometry verified.");
    }
}
