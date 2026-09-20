/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * animation.js
 * ==========================================================
 */

class Animation {

    /**
     * ======================================================
     * INIT
     * ======================================================
     */

    static init(){

        document.documentElement.classList.add(

            "animation-enabled"

        );

    }

    /**
     * ======================================================
     * PLAY
     * ======================================================
     */

    static play(name, element){

        if(!element)
            return;

        element.classList.remove(name);

        void element.offsetWidth;

        element.classList.add(name);

        element.addEventListener(

            "animationend",

            ()=>{

                element.classList.remove(name);

            },

            { once:true }

        );

    }

    /**
     * ======================================================
     * FADE IN
     * ======================================================
     */

    static fadeIn(element){

        this.play(

            "fade-in",

            element

        );

    }

    /**
     * ======================================================
     * FADE OUT
     * ======================================================
     */

    static fadeOut(element){

        this.play(

            "fade-out",

            element

        );

    }

    /**
     * ======================================================
     * SLIDE UP
     * ======================================================
     */

    static slideUp(element){

        this.play(

            "slide-up",

            element

        );

    }

    /**
     * ======================================================
     * SLIDE DOWN
     * ======================================================
     */

    static slideDown(element){

        this.play(

            "slide-down",

            element

        );

    }

    /**
     * ======================================================
     * SCALE
     * ======================================================
     */

    static scale(element){

        this.play(

            "scale-in",

            element

        );

    }

    /**
     * ======================================================
     * SHAKE
     * ======================================================
     */

    static shake(element){

        this.play(

            "shake",

            element

        );

    }

    /**
     * ======================================================
     * SUCCESS
     * ======================================================
     */

    static success(element){

        this.play(

            "success-pop",

            element

        );

    }

    /**
     * ======================================================
     * HIGHLIGHT
     * ======================================================
     */

    static highlight(element){

        this.play(

            "highlight",

            element

        );

    }

    /**
     * ======================================================
     * LOADING
     * ======================================================
     */

    static loading(show=true){

        const loading =

            document.getElementById(

                "loading-screen"

            );

        if(!loading)
            return;

        loading.style.display =

            show

            ? "flex"

            : "none";

    }

    /**
     * ======================================================
     * ENABLE
     * ======================================================
     */

    static enable(){

        document.documentElement.classList.remove(

            "reduce-motion"

        );

    }

    /**
     * ======================================================
     * DISABLE
     * ======================================================
     */

    static disable(){

        document.documentElement.classList.add(

            "reduce-motion"

        );

    }

    /**
     * ======================================================
     * TOGGLE
     * ======================================================
     */

    static toggle(){

        document.documentElement.classList.toggle(

            "reduce-motion"

        );

    }

}

export default Animation;